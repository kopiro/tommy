const fs = require('fs');
const sizeOf = require('image-size');

const util = require('./util');
const converter = require('./converter');

async function processImage(filepath) {
	const dst_path = filepath;
	console.debug(`Stripping image <${filepath}>`);
	await util.execPromise(`convert "${filepath}" -strip -quality 80 "${dst_path}"`);
	return dst_path;
}

async function processJPG(filepath) {
	const dst_path = filepath;
	console.debug(`Optimizing JPEG <${filepath}>`);
	await util.execPromise(`jpegoptim "${filepath}"`);
	return dst_path;
}

async function processPNG(filepath) {
	const dst_path = filepath;
	console.debug(`Optimizing PNG <${filepath}>`);
	await util.execPromise(`pngquant --ext .png --force "${filepath}"`);
	return dst_path;
}

async function processGIF(filepath) {
	const dst_path = filepath;
	console.debug(`Optimizing GIF <${filepath}>`);
	await util.execPromise(`gifsicle -O2 "${filepath}" -f -o "${dst_path}"`);
	return dst_path;
}

async function processSVG(filepath) {
	const dst_path = filepath;

	console.debug(`Optimizing SVG <${filepath}>`);
	await util.execPromise(`svgo \
	"${filepath}" \
	-o "${dst_path}"`);

	return dst_path;
}

async function processPoster(filepath) {
	const dst_path = filepath.replace(/\..+$/g, '-poster.jpg');

	console.debug(`Extracting poster of <${filepath}> to <${dst_path}>`);
	await util.execPromise(`ffmpeg -y \
	-i "${filepath}" \
	-vframes 1 \
	-f image2 \
	"${dst_path}"`);

	await processImage(dst_path);
	await processJPG(dst_path);
	await converter.toWEBP(dst_path);

	return dst_path;
}

async function processLazyLoadBlurriedImage(filepath) {
	const dst_path = filepath.replace(/\..+$/g, '-blurried.jpg');

	console.debug(`Extracting poster of <${filepath}> to <${dst_path}>`);
	await util.execPromise(`convert "${filepath}" -strip -resize "10^" "${dst_path}"`);

	return dst_path;
}

async function processResize(filepath) {
	const resized_images = [];

	const size = sizeOf(filepath);
	const largest_side = Math.max(size.width, size.height);

	for (let px of global.config.resize) {
		if (px < largest_side) {
			const dst_path = filepath.replace(/\.(.+)$/g, `-resized-${px}.$1`);
			console.debug(`Resizing image <${filepath}> to <${dst_path}>`);

			try {
				await util.execPromise(
					`convert "${filepath}" -strip -quality 80 -resize "${px}^>" "${dst_path}"`
				);
				resized_images.push(dst_path);
			} catch (err) {
				console.error(`Error during resizing to ${px} of <${filepath}>`);
			}
		} else {
			console.debug(
				`Skipping resizing to ${px} of <${filepath}> because ${px} is greater than image largest side (${largest_side})`
			);
		}
	}

	return resized_images;
}

exports.image = processImage;
exports.poster = processPoster;
exports.resize = processResize;
exports.lazyLoadBlurried = processLazyLoadBlurriedImage;

exports.JPG = processJPG;
exports.PNG = processPNG;
exports.GIF = processGIF;
exports.SVG = processSVG;