const fs = require('fs');
const util = require('./util');
const Tommy = require('..');

async function overwriteProtection(filepath, dst_path) {
	const src_path = dst_path.replace(Tommy.__dst, Tommy.__src);
	if (fs.existsSync(src_path)) {
		throw new Error(
			`Unable to convert <${filepath}> because original <${src_path}> will be overwritten`
		);
	}
	return true;
}

async function convertToWEBP(filepath) {
	if (Tommy.config.converter.webp == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.webp');
	await overwriteProtection(filepath, dst_path);

	console.debug(`Converting to WEBP <${filepath}>`);
	await util.execPromise(`cwebp \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

async function convertToMP4(filepath) {
	if (Tommy.config.converter.mp4 == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.mp4');
	await overwriteProtection(filepath, dst_path);

	console.debug(`Converting to MP4 <${filepath}>`);
	await util.execPromise(`ffmpeg -y \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

async function convertToWEBM(filepath) {
	if (Tommy.config.converter.webm == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.webm');
	await overwriteProtection(filepath, dst_path);

	console.debug(`Converting to WEBM <${filepath}>`);
	await util.execPromise(`ffmpeg -y \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

async function convertToMP3(filepath) {
	if (Tommy.config.converter.mp3 == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.mp3');
	await overwriteProtection(filepath, dst_path);

	console.debug(`Converting to MP3 <${filepath}>`);
	await util.execPromise(`ffmpeg -y \
      -i "${filepath}" \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

exports.toWEBP = convertToWEBP;
exports.toMP4 = convertToMP4;
exports.toWEBM = convertToWEBM;
exports.toMP3 = convertToMP3;