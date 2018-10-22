const sizeOf = require('image-size');
const util = require('./util');
const fs = require('fs');
const path = require('path');

async function copy(tommy, filepath) {
	const file = tommy.getCleanFileName(filepath);

	const src_filepath = tommy.getSrcFilePath(file);
	const dst_filepath = tommy.getDstFilePath(file);

	// Create directory of file
	const dst_dirpath = path.dirname(dst_filepath);
	await util.execPromise(`mkdir -p "${dst_dirpath}"`);

	console.debug(`Copying to <${dst_filepath}>`);
	await util.execPromise(`cp "${src_filepath}" "${dst_filepath}"`);

	return dst_filepath;
}

copy.ALGO_VERSION = '1';

async function processImage(tommy, filepath) {
	const config = tommy.config['processor.image'];
	const dst_path = filepath;

	console.debug(`General optimizing image to <${dst_path}>`);
	await util.execPromise(
		`convert \
		"${filepath}" \
		-strip \
		-quality "${config.quality}" \
		"${dst_path}"`);
	return dst_path;
}

processImage.ALGO_VERSION = '1';

async function processJPG(tommy, filepath) {
	const config = tommy.config['processor.jpg'];
	const dst_path = filepath;

	console.debug(`Optimizing JPEG <${dst_path}>`);
	await util.execPromise(
		`jpegoptim \
		"${filepath}"`);
	return dst_path;
}

processJPG.ALGO_VERSION = '1';

async function processPNG(tommy, filepath) {
	const config = tommy.config['processor.png'];
	const dst_path = filepath;

	console.debug(`Optimizing PNG <${dst_path}`);
	await util.execPromise(
		`pngquant \
		--ext .png \
		--force \
		"${filepath}"`);
	return dst_path;
}

processPNG.ALGO_VERSION = '1';

async function processGIF(tommy, filepath) {
	const config = tommy.config['processor.gif'];
	const dst_path = filepath;

	console.debug(`Optimizing GIF <${dst_path}>`);
	await util.execPromise(
		`gifsicle \
		-O2 \
		"${filepath}" \
		-f \
		-o \
		"${dst_path}"`);
	return dst_path;
}

processGIF.ALGO_VERSION = '1';

async function processSVG(tommy, filepath) {
	const config = tommy.config['processor.svg'];
	const dst_path = filepath;

	console.debug(`Optimizing SVG <${dst_path}>`);
	await util.execPromise(
		`svgo \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

processSVG.ALGO_VERSION = '1';

async function processVideoThumbs(tommy, filepath) {
	const config = tommy.config['processor.videoThumbs'];
	const dst_path = filepath.replace(util.REGEX_EXT, config.suffix.replace('${i}', '%d'));
	console.debug(`Extracting thumbnails to <${dst_path}>`);

	let video_duration = (await util.execPromise(`ffprobe -hide_banner -i "${filepath}" -show_format -v quiet | sed -n 's/duration=//p'`));
	let rate = config.count / video_duration;
	if (isNaN(rate)) rate = 0.1;

	await util.execPromise(
		`ffmpeg -y -hide_banner -loglevel panic \
		-i "${filepath}" \
		-r "${rate}" \
		-vframes "${config.count}" \
		-f image2 \
		"${dst_path}"`);

	let video_thumbs = [];
	for (let i = 1; i <= config.count; i++) {
		const url = `${filepath.replace(util.REGEX_EXT, '')}${config.suffix.replace('${i}', i)}`;
		if (fs.existsSync(url)) {
			video_thumbs.push(url);
		}
	}

	for (let url of video_thumbs) {
		await util.execPromise(
			`convert \
			"${url}" \
			-resize "${config.size}x${config.size}>" \
			-strip \
			-quality "${config.quality}" \
			"${url}"`);
	}

	return video_thumbs;
}

processVideoThumbs.ALGO_VERSION = '1';

async function processPoster(tommy, filepath) {
	const config = tommy.config['processor.poster'];
	const dst_path = filepath.replace(util.REGEX_EXT, config.suffix);

	console.debug(`Extracting poster to <${dst_path}>`);

	await util.execPromise(
		`ffmpeg -y -hide_banner -loglevel panic \
		-i "${filepath}" \
		-vframes 1 \
		-f image2 \
		"${dst_path}"`);

	return dst_path;
}

processPoster.ALGO_VERSION = '1';

async function processLazyLoadBlurriedImage(tommy, filepath) {
	const config = tommy.config['processor.lazyLoadBlurried'];
	const dst_path = filepath.replace(util.REGEX_EXT, config.suffix);

	console.debug(`Extracting blurried image to <${dst_path}>`);

	await util.execPromise(
		`convert \
		"${filepath}" \
		-strip \
		-resize "${config.size}x${config.size}" \
		"${dst_path}"`);

	return dst_path;
}

processLazyLoadBlurriedImage.ALGO_VERSION = '1';

async function processResize(tommy, filepath) {
	const config = tommy.config['processor.resize'];

	const resized_images = [];

	const size = sizeOf(filepath);
	const largest_side = Math.max(size.width, size.height);

	for (let px of config.dimensions) {
		if (px < largest_side) {
			const ext = util.getExtension(filepath);
			const dst_path = filepath.replace(util.REGEX_EXT, config.suffix.replace('${i}', px).replace('${ext}', ext));
			console.debug(`Resizing image to ${px}px to <${dst_path}>`);

			try {

				await util.execPromise(
					`convert \
					"${filepath}" \
					-strip \
					-quality "${config.quality}" \
					-resize "${px}x${px}>" \
					"${dst_path}"`
				);

				resized_images.push(dst_path);

			} catch (err) {
				console.error(`Error during resizing to ${px}`);
			}
		} else {
			console.warn(`Skipping resizing to ${px}px because ${px}px is greater than image largest side (${largest_side}px)`);
		}
	}

	return resized_images;
}

processResize.ALGO_VERSION = '1';

async function processLESS(tommy, filepath) {
	const config = tommy.config['processor.less'];

	const dst_path = filepath.replace(/\.less$/, '.css');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Processing LESS to CSS to <${dst_path}>`);

	await util.execPromise(`lessc "${filepath}" "${dst_path}"`);

	return dst_path;
}

processLESS.ALGO_VERSION = '1';

async function processSASS(tommy, filepath) {
	const config = tommy.config['processor.sass'];

	const dst_path = filepath.replace(/\.sass$/, '.css');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Processing SASS to CSS to <${dst_path}>`);

	await util.execPromise(`sass "${filepath}" "${dst_path}"`);

	return dst_path;
}

processSASS.ALGO_VERSION = '1';

async function processFavicon(tommy, filepath) {
	const config = tommy.config['processor.favicon'];

	const dst_paths = {
		'favicon': path.join(tommy.dst, 'favicon.ico'),
		'android_192': path.join(tommy.dst, 'android-chrome-192x192.png'),
		'android_512': path.join(tommy.dst, 'android-chrome-512x512.png'),
		'ios': path.join(tommy.dst, 'apple-touch-icon.png'),
		'favicon_16': path.join(tommy.dst, 'favicon-16x16.png'),
		'favicon_32': path.join(tommy.dst, 'favicon-32x32.png'),
		'mstile': path.join(tommy.dst, 'mstile-150x150.png'),
		'webmanifest': path.join(tommy.dst, 'site.webmanifest'),
		'browserconfig': path.join(tommy.dst, 'browserconfig.xml'),
		'test': path.join(tommy.dst, 'favicon.html')
	};

	console.debug(`Processing Favicon`);

	// Generate favicon
	await util.execPromise(`
	convert "${filepath}" \
	-define icon:auto-resize="64,48,32,16" \
	"${dst_paths.favicon}"`);

	// Generate Android icons
	await util.execPromise(`
	convert "${filepath}" \
	-resize 192x192 \
	"${dst_paths.android_192}"`);
	await util.execPromise(`
	convert "${filepath}" \
	-resize 512x512 \
	"${dst_paths.android_512}"`);

	// Generate iOS icons
	await util.execPromise(`
	convert "${filepath}" \
	-resize 180x180 \
	"${dst_paths.ios}"`);

	// Generate PNG icons
	await util.execPromise(`
	convert "${filepath}" \
	-resize 16x16 \
	"${dst_paths.favicon_16}"`);
	await util.execPromise(`
	convert "${filepath}" \
	-resize 16x16 \
	"${dst_paths.favicon_32}"`);

	// Generate Mstile
	await util.execPromise(`
	convert "${filepath}" \
	-background none \
	-resize 100x100 \
	-gravity center \
	-extent 150x150 \
	"${dst_paths.mstile}"`);

	// Generate Android manifest
	if (config.webmanifest != false) {
		fs.writeFileSync(dst_paths.webmanifest, JSON.stringify(Object.assign({
				"icons": [{
						"src": "/" + path.basename(dst_paths.android_192),
						"sizes": "192x192",
						"type": "image/png"
					},
					{
						"src": "/" + path.basename(dst_paths.android_512),
						"sizes": "512x512",
						"type": "image/png"
					}
				]
			},
			config.webmanifest)));
	} else {
		delete dst_paths.webmanifest;
	}

	// Generate MS manifest
	if (config.browserconfig != false) {
		fs.writeFileSync(dst_paths.browserconfig,
			`<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
	<msapplication>
		<tile>
			<square150x150logo src="/${path.basename(dst_paths.mstile)}"/>
			<TileColor>${config.tileColor}</TileColor>
		</tile>
	</msapplication>
</browserconfig>`);
	} else {
		delete dst_paths.browserconfig;
	}

	if (config.html != false) {
		fs.writeFileSync(dst_paths.test,
			`<!doctype html>
<html>
	<head>
		<link rel="apple-touch-icon" sizes="180x180" href="${path.basename(dst_paths.ios)}">
		<link rel="icon" type="image/png" sizes="32x32" href="${path.basename(dst_paths.favicon_32)}">
		<link rel="icon" type="image/png" sizes="16x16" href="${path.basename(dst_paths.favicon_16)}">` +
			(dst_paths.webmanifest ? `<link rel="manifest" href="${path.basename(dst_paths.webmanifest)}">` : ``) +
			(config.tileColor ? `<meta name="msapplication-TileColor" content="${config.tileColor}">` : ``) +
			(config.themeColor ? `<meta name="theme-color" content="${config.themeColor}">` : ``) + `
	</head>
</html>`);
	} else {
		delete dst_paths.test;
	}

	return Object.values(dst_paths);
}

processFavicon.ALGO_VERSION = '1';

// Expose

exports.copy = copy;

exports.image = processImage;
exports.poster = processPoster;
exports.videoThumbs = processVideoThumbs;
exports.resize = processResize;
exports.lazyLoadBlurried = processLazyLoadBlurriedImage;

exports.jpg = processJPG;
exports.png = processPNG;
exports.gif = processGIF;
exports.svg = processSVG;
exports.less = processLESS;
exports.sass = processSASS;
exports.favicon = processFavicon;