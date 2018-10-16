const fs = require('fs');
const util = require('./util');

async function convertToWEBP(tommy, filepath) {
	if (tommy.config.converter.webp == false) return false;

	const dst_path = filepath.replace(util.REGEX_EXT, '.webp');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to WEBP <${dst_path}>`);
	await util.execPromise(`cwebp -mt \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

async function convertToMP4(tommy, filepath) {
	if (tommy.config.converter.mp4 == false) return false;

	const dst_path = filepath.replace(util.REGEX_EXT, '.mp4');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to MP4 <${dst_path}>`);
	await util.execPromise(`ffmpeg -y -hide_banner -loglevel panic \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}"`);
	return dst_path;
}

async function convertToWEBM(tommy, filepath) {
	if (tommy.config.converter.webm == false) return false;

	const dst_path = filepath.replace(util.REGEX_EXT, '.webm');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to WEBM <${dst_path}>`);
	await util.execPromise(`ffmpeg -y -hide_banner -loglevel panic \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}"`);
	return dst_path;
}

async function convertToMP3(tommy, filepath) {
	if (tommy.config.converter.mp3 == false) return false;

	const dst_path = filepath.replace(util.REGEX_EXT, '.mp3');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to MP3 <${dst_path}>`);
	await util.execPromise(`ffmpeg -y -hide_banner -loglevel panic \
      -i "${filepath}" \
      "${dst_path}"`);
	return dst_path;
}

async function convertUsingFontForge(tommy, format, filepath) {
	if (tommy.config.converter[format] == false) return false;

	const dst_path = filepath.replace(util.REGEX_EXT, `.${format}`);
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to ${format.toUpperCase()} <${dst_path}>`);
	await util.execPromise(`FONTFORGE_LANGUAGE=ff fontforge -quiet \
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

	const dst_path = filepath.replace(util.REGEX_EXT, '.' + format);
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to ${format.toUpperCase()} <${dst_path}>`);
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