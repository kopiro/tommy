const sizeOf = require('image-size');
const util = require('./util');
const fs = require('fs');
const path = require('path');

async function processImage(tommy, filepath) {
	if (tommy.config.processor.image == false) return false;

	const dst_path = filepath;
	console.debug(`Stripping image`);
	await util.execPromise(
		`convert \
		"${filepath}" \
		-strip \
		-quality "${tommy.config.image.quality}" \
		"${dst_path}"`);
	return dst_path;
}

async function processJPG(tommy, filepath) {
	if (tommy.config.processor.jpg == false) return false;

	const dst_path = filepath;
	console.debug('Optimizing JPEG');
	await util.execPromise(
		`jpegoptim \
		"${filepath}"`);
	return dst_path;
}

async function processPNG(tommy, filepath) {
	if (tommy.config.processor.png == false) return false;

	const dst_path = filepath;
	console.debug('Optimizing PNG');
	await util.execPromise(
		`pngquant \
		--ext .png \
		--force \
		"${filepath}"`);
	return dst_path;
}

async function processGIF(tommy, filepath) {
	if (tommy.config.processor.gif == false) return false;

	const dst_path = filepath;
	console.debug('Optimizing GIF');
	await util.execPromise(
		`gifsicle \
		-O2 \
		"${filepath}" \
		-f \
		-o \
		"${dst_path}"`);
	return dst_path;
}

async function processSVG(tommy, filepath) {
	if (tommy.config.processor.svg == false) return false;

	const dst_path = filepath;
	console.debug('Optimizing SVG');
	await util.execPromise(
		`svgo \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

async function processVideoThumbs(tommy, filepath) {
	if (tommy.config.processor.videoThumbs == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '-thumb-%03d.jpg');

	console.debug(`Extracting thumbnails to <${dst_path}>`);

	await util.execPromise(
		`ffmpeg -y \
		-i "${filepath}" \
		-vf fps="${tommy.config.videoThumbs.fps}" \
		"${dst_path}"`);

	return dst_path;
}

async function processPoster(tommy, filepath) {
	if (tommy.config.processor.poster == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '-poster.jpg');

	console.debug(`Extracting poster to <${dst_path}>`);

	await util.execPromise(
		`ffmpeg -y \
		-i "${filepath}" \
		-vframes 1 \
		-f image2 \
		"${dst_path}"`);

	await processImage(tommy, dst_path);
	await processJPG(tommy, dst_path);

	return dst_path;
}

async function processLazyLoadBlurriedImage(tommy, filepath) {
	if (tommy.config.processor.lazyLoadBlurried == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '-blurried.jpg');

	console.debug(`Extracting blurried image to <${dst_path}>`);

	await util.execPromise(
		`convert \
		"${filepath}" \
		-strip \
		-resize "${tommy.config.lazyLoadBlurried.size}x${tommy.config.lazyLoadBlurried.size}^" \
		"${dst_path}"`);

	return dst_path;
}

async function processResize(tommy, filepath) {
	if (tommy.config.processor.resize == false) return false;

	const resized_images = [];

	const size = sizeOf(filepath);
	const largest_side = Math.max(size.width, size.height);

	for (let px of tommy.config.resize.dimensions) {
		if (px < largest_side) {
			const dst_path = filepath.replace(/\.(.+)$/g, `-resized-${px}.$1`);
			console.debug(`Resizing image of ${px}px to <${dst_path}>`);

			try {
				await util.execPromise(
					`convert \
					"${filepath}" \
					-strip \
					-quality "${tommy.config.resize.quality}" \
					-resize "${px}x${px}>" \
					"${dst_path}"`
				);
				resized_images.push(dst_path);
			} catch (err) {
				console.error(`Error during resizing to ${px}`);
			}
		} else {
			console.debug(
				`Skipping resizing to ${px}px because ${px}px is greater than image largest side (${largest_side}px)`
			);
		}
	}

	return resized_images;
}

async function processFontCSS(tommy, filepath) {
	if (tommy.config.processor.fontCSS == false) return false;

	const file_url = filepath.replace(/\..+$/, '').replace(tommy.dst, '');
	const name = path.basename(file_url);

	const css_file = path.join(path.dirname(filepath.replace(tommy.src, tommy.dst)), name + '.css');
	const css_string = `@font-face {
		font-family: '${name}';
		src: url('${file_url}.eot'); /* IE9 Compat Modes */
		src: url('${file_url}.eot?#iefix') format('embedded-opentype'), /* IE6-IE8 */
			  url('${file_url}.woff2') format('woff2'), /* Super Modern Browsers */
			  url('${file_url}.woff') format('woff'), /* Pretty Modern Browsers */
			  url('${file_url}.ttf')  format('truetype'), /* Safari, Android, iOS */
			  url('${file_url}.svg#${name}') format('svg'); /* Legacy iOS */
	}`;

	console.debug(`Extracting CSS font-face declaration to <${css_file}>`);
	fs.writeFileSync(css_file, css_string);

	const html_file = css_file.replace('.css', '.html');
	const sentence = 'The quick brown fox jumps over the lazy dog';
	const html_string = `<!doctype html>
		<style>${css_string.replace(new RegExp(file_url, 'g'), `./${name}`)}</style>
		<style>body { font-family: "${name}"; }</style>
		<h1>${name}</h1>
		<hr/>
		<h1>${sentence}</h1>
		<h2>${sentence}</h2>
		<h3>${sentence}</h3>
		<p>${sentence}</p>
	`;

	console.debug(`Extracting HTML test for font-face declaration to <${html_file}>`);
	fs.writeFileSync(html_file, html_string);

	return css_file;
}

exports.image = processImage;
exports.poster = processPoster;
exports.videoThumbs = processVideoThumbs;
exports.resize = processResize;
exports.lazyLoadBlurried = processLazyLoadBlurriedImage;
exports.fontCSS = processFontCSS;

exports.JPG = processJPG;
exports.PNG = processPNG;
exports.GIF = processGIF;
exports.SVG = processSVG;