const fs = require('fs');
const sizeOf = require('image-size');
const path = require('path');
const find = require('find');

const util = require('./util');
const converter = require('./converter');

async function processImage(filepath) {
	if (global.config.processor.image == false) return false;

	const dst_path = filepath;
	console.debug(`Stripping image`);
	await util.execPromise(
		`convert \
		"${filepath}" \
		-strip \
		-quality "${global.config.image.quality}" \
		"${dst_path}"`);
	return dst_path;
}

async function processJPG(filepath) {
	if (global.config.processor.jpg == false) return false;

	const dst_path = filepath;
	console.debug('Optimizing JPEG');
	await util.execPromise(
		`jpegoptim \
		"${filepath}"`);
	return dst_path;
}

async function processPNG(filepath) {
	if (global.config.processor.png == false) return false;

	const dst_path = filepath;
	console.debug('Optimizing PNG');
	await util.execPromise(
		`pngquant \
		--ext .png \
		--force \
		"${filepath}"`);
	return dst_path;
}

async function processGIF(filepath) {
	if (global.config.processor.gif == false) return false;

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

async function processSVG(filepath) {
	if (global.config.processor.svg == false) return false;

	const dst_path = filepath;
	console.debug('Optimizing SVG');
	await util.execPromise(
		`svgo \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

async function processVideoThumbs(filepath) {
	if (global.config.processor.videoThumbs == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '-thumb-%03d.jpg');

	console.debug(`Extracting thumbnails to <${dst_path}>`);

	await util.execPromise(
		`ffmpeg -y \
		-i "${filepath}" \
		-vf fps="${global.config.videoThumbs.fps}" \
		"${dst_path}"`);

	return dst_path;
}

async function processPoster(filepath) {
	if (global.config.processor.poster == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '-poster.jpg');

	console.debug(`Extracting poster to <${dst_path}>`);

	await util.execPromise(
		`ffmpeg -y \
		-i "${filepath}" \
		-vframes 1 \
		-f image2 \
		"${dst_path}"`);

	await processImage(dst_path);
	await processJPG(dst_path);

	return dst_path;
}

async function processLazyLoadBlurriedImage(filepath) {
	if (global.config.processor.lazyLoadBlurried == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '-blurried.jpg');

	console.debug(`Extracting blurried image to <${dst_path}>`);

	await util.execPromise(
		`convert \
		"${filepath}" \
		-strip \
		-resize "${global.config.lazyLoadBlurried.size}x${global.config.lazyLoadBlurried.size}^" \
		"${dst_path}"`);

	return dst_path;
}

async function processResize(filepath) {
	if (global.config.processor.resize == false) return false;

	const resized_images = [];

	const size = sizeOf(filepath);
	const largest_side = Math.max(size.width, size.height);

	for (let px of global.config.resize.dimensions) {
		if (px < largest_side) {
			const dst_path = filepath.replace(/\.(.+)$/g, `-resized-${px}.$1`);
			console.debug(`Resizing image of ${px}px to <${dst_path}>`);

			try {
				await util.execPromise(
					`convert \
					"${filepath}" \
					-strip \
					-quality "${global.config.resize.quality}" \
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

exports.image = processImage;
exports.poster = processPoster;
exports.videoThumbs = processVideoThumbs;
exports.resize = processResize;
exports.lazyLoadBlurried = processLazyLoadBlurriedImage;

exports.JPG = processJPG;
exports.PNG = processPNG;
exports.GIF = processGIF;
exports.SVG = processSVG;