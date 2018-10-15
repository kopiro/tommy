const fs = require('fs');
const util = require('./util');

async function overwriteProtection(tommy, filepath, dst_path) {
	const src_path = dst_path.replace(tommy.dst, tommy.src);
	if (fs.existsSync(src_path)) {
		throw new Error(
			`Unable to convert <${filepath}> because original <${src_path}> will be overwritten`
		);
	}
	return true;
}

async function convertToWEBP(tommy, filepath) {
	if (tommy.config.converter.webp == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.webp');
	await overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to WEBP <${filepath}>`);
	await util.execPromise(`cwebp \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

async function convertToMP4(tommy, filepath) {
	if (tommy.config.converter.mp4 == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.mp4');
	await overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to MP4 <${filepath}>`);
	await util.execPromise(`ffmpeg -y \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

async function convertToWEBM(tommy, filepath) {
	if (tommy.config.converter.webm == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.webm');
	await overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to WEBM <${filepath}>`);
	await util.execPromise(`ffmpeg -y \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

async function convertToMP3(tommy, filepath) {
	if (tommy.config.converter.mp3 == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.mp3');
	await overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to MP3 <${filepath}>`);
	await util.execPromise(`ffmpeg -y \
      -i "${filepath}" \
      "${dst_path}" \
		-hide_banner`);
	return dst_path;
}

async function convertUsingFontForge(tommy, format, filepath) {
	if (tommy.config.converter[format] == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.' + format);
	await overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to ${format.toUpperCase()} <${filepath}>`);
	await util.execPromise(`FONTFORGE_LANGUAGE=ff fontforge \
		-c 'Open("${filepath}"); Generate("${dst_path}")'`);
	return dst_path;
}

async function convertToOTF(tommy, filepath) {
	return convertUsingFontForge(tommy, 'otf', filepath);
}

async function convertToTTF(tommy, filepath) {
	return convertUsingFontForge(tommy, 'ttf', filepath);
}

async function convertToSVG(tommy, filepath) {
	return convertUsingFontForge(tommy, 'svg', filepath);
}

async function convertToEOT(tommy, filepath) {
	return convertUsingFontForge(tommy, 'eot', filepath);
}

async function convertToWOFF(tommy, filepath) {
	return convertUsingFontForge(tommy, 'woff', filepath);
}

async function convertToWOFF2(tommy, filepath) {
	const format = 'woff2';

	if (tommy.config.converter[format] == false) return false;

	const dst_path = filepath.replace(/\..+$/g, '.' + format);
	await overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to ${format.toUpperCase()} <${filepath}>`);
	await util.execPromise(`woff2_compress \
		"${filepath}"`);
	return dst_path;
}

exports.toWEBP = convertToWEBP;
exports.toMP4 = convertToMP4;
exports.toWEBM = convertToWEBM;
exports.toMP3 = convertToMP3;
exports.toOTF = convertToOTF;
exports.toTTF = convertToTTF;
exports.toSVG = convertToSVG;
exports.toEOT = convertToEOT;
exports.toWOFF = convertToWOFF;
exports.toWOFF2 = convertToWOFF2;