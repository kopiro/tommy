const util = require('./util');

async function convertUsingFontForge(tommy, format, filepath) {
	const dst_path = filepath.replace(util.REGEX_EXT, `.${format}`);
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to ${format.toUpperCase()} <${dst_path}>`);
	await util.execPromise(`FONTFORGE_LANGUAGE=ff fontforge -quiet \
		-c 'Open("${filepath}"); Generate("${dst_path}")'`);
	return dst_path;
}

convertUsingFontForge.ALGO_VERSION = '1';

async function convertToWEBP(tommy, filepath) {
	const dst_path = filepath.replace(util.REGEX_EXT, '.webp');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to WEBP <${dst_path}>`);
	await util.execPromise(`cwebp -mt \
		"${filepath}" \
		-o "${dst_path}"`);
	return dst_path;
}

convertToWEBP.ALGO_VERSION = '1';

async function convertToMP4(tommy, filepath) {
	const dst_path = filepath.replace(util.REGEX_EXT, '.mp4');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to MP4 <${dst_path}>`);
	await util.execPromise(`ffmpeg -y -hide_banner -loglevel panic \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}"`);
	return dst_path;
}

convertToMP4.ALGO_VERSION = '1';

async function convertToWEBM(tommy, filepath) {
	const dst_path = filepath.replace(util.REGEX_EXT, '.webm');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to WEBM <${dst_path}>`);
	await util.execPromise(`ffmpeg -y -hide_banner -loglevel panic \
      -i "${filepath}" \
      -preset fast \
      "${dst_path}"`);
	return dst_path;
}

convertToWEBM.ALGO_VERSION = '1';

async function convertToMP3(tommy, filepath) {
	const dst_path = filepath.replace(util.REGEX_EXT, '.mp3');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to MP3 <${dst_path}>`);
	await util.execPromise(`ffmpeg -y -hide_banner -loglevel panic \
      -i "${filepath}" \
      "${dst_path}"`);
	return dst_path;
}

convertToMP3.ALGO_VERSION = '1';

async function convertToOTF(tommy, filepath) {
	return convertUsingFontForge(tommy, 'otf', filepath);
}

convertToOTF.ALGO_VERSION = convertUsingFontForge.ALGO_VERSION;

async function convertToTTF(tommy, filepath) {
	return convertUsingFontForge(tommy, 'ttf', filepath);
}

convertToTTF.ALGO_VERSION = convertUsingFontForge.ALGO_VERSION;

async function convertToSVG(tommy, filepath) {
	return convertUsingFontForge(tommy, 'svg', filepath);
}

convertToSVG.ALGO_VERSION = convertUsingFontForge.ALGO_VERSION;

async function convertToEOT(tommy, filepath) {
	return convertUsingFontForge(tommy, 'eot', filepath);
}

convertToEOT.ALGO_VERSION = convertUsingFontForge.ALGO_VERSION;

async function convertToWOFF(tommy, filepath) {
	return convertUsingFontForge(tommy, 'woff', filepath);
}

convertToWOFF.ALGO_VERSION = convertUsingFontForge.ALGO_VERSION;

async function convertToWOFF2(tommy, filepath) {
	const dst_path = filepath.replace(util.REGEX_EXT, '.woff');
	await util.overwriteProtection(tommy, filepath, dst_path);

	console.debug(`Converting to WOFF2 <${dst_path}>`);
	await util.execPromise(`woff2_compress \
		"${filepath}"`);
	return dst_path;
}

convertToWOFF2.ALGO_VERSION = '1';

// Expose

exports.webp = convertToWEBP;
exports.mp4 = convertToMP4;
exports.webm = convertToWEBM;
exports.mp3 = convertToMP3;
exports.otf = convertToOTF;
exports.ttf = convertToTTF;
exports.svg = convertToSVG;
exports.eot = convertToEOT;
exports.woff = convertToWOFF;
exports.woff2 = convertToWOFF2;