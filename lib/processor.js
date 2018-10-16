const sizeOf = require('image-size');
const util = require('./util');
const fs = require('fs');
const path = require('path');

async function processImage(tommy, filepath) {
	if (tommy.config.processor.image == false) return false;

	const dst_path = filepath;
	console.debug(`General optimizing image to <${dst_path}>`);
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
	console.debug(`Optimizing JPEG <${dst_path}>`);
	await util.execPromise(
		`jpegoptim \
		"${filepath}"`);
	return dst_path;
}

async function processPNG(tommy, filepath) {
	if (tommy.config.processor.png == false) return false;

	const dst_path = filepath;
	console.debug(`Optimizing PNG <${dst_path}`);
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

async function processSVG(tommy, filepath) {
	if (tommy.config.processor.svg == false) return false;

	const dst_path = filepath;
	console.debug(`Optimizing SVG <${dst_path}>`);
	await util.execPromise(
		`svgo \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

exports.VIDEO_THUMBS_SUFFIX = '-thumb-${i}.jpg';

async function processVideoThumbs(tommy, filepath) {
	if (tommy.config.processor.videoThumbs == false) return false;

	const dst_path = filepath.replace(/\..+$/g, exports.VIDEO_THUMBS_SUFFIX.replace('${i}', '%03d'));

	console.debug(`Extracting thumbnails to <${dst_path}>`);

	await util.execPromise(
		`ffmpeg -y \
		-i "${filepath}" \
		-vf fps="${tommy.config.videoThumbs.fps}" \
		"${dst_path}"`);

	return dst_path;
}

exports.POSTER_SUFFIX = '-poster.jpg';

async function processPoster(tommy, filepath) {
	if (tommy.config.processor.poster == false) return false;

	const dst_path = filepath.replace(/\..+$/g, exports.POSTER_SUFFIX);

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

exports.LAZY_LOAD_BLURRIED_SUFFIX = '-blurried.jpg';

async function processLazyLoadBlurriedImage(tommy, filepath) {
	if (tommy.config.processor.lazyLoadBlurried == false) return false;

	const dst_path = filepath.replace(/\..+$/g, exports.LAZY_LOAD_BLURRIED_SUFFIX);

	console.debug(`Extracting blurried image to <${dst_path}>`);

	await util.execPromise(
		`convert \
		"${filepath}" \
		-strip \
		-resize "${tommy.config.lazyLoadBlurried.size}x${tommy.config.lazyLoadBlurried.size}^" \
		"${dst_path}"`);

	return dst_path;
}

exports.RESIZE_SUFFIX = '-resized-${i}.${ext}';

async function processResize(tommy, filepath) {
	if (tommy.config.processor.resize == false) return false;

	const resized_images = [];

	const size = sizeOf(filepath);
	const largest_side = Math.max(size.width, size.height);

	for (let px of tommy.config.resize.dimensions) {
		if (px < largest_side) {
			const ext = filepath.match(/\.(.+)$/)[1];
			const dst_path = filepath.replace(/\..+$/, exports.RESIZE_SUFFIX.replace('${i}', px).replace('${ext}', ext));
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
			console.warn(`Skipping resizing to ${px}px because ${px}px is greater than image largest side (${largest_side}px)`);
		}
	}

	return resized_images;
}

exports.image = processImage;
exports.poster = processPoster;
exports.videoThumbs = processVideoThumbs;
exports.resize = processResize;
exports.lazyLoadBlurried = processLazyLoadBlurriedImage;

exports.JPG = processJPG;
exports.PNG = processPNG;
exports.GIF = processGIF;
exports.SVG = processSVG;