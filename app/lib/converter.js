const fs = require('fs');
const util = require('./util');

async function overwriteProtection(filepath, dst_path) {
   const src_path = dst_path.replace(global.__dst, global.__src);
   if (fs.existsSync(src_path)) {
      throw new Error(
         `Unable to convert <${filepath}> because original <${src_path}> will be overwritten`
      );
   }
   return true;
}

async function convertToWEBP(filepath) {
   const dst_path = filepath.replace(/\..+$/g, '.webp');
   await overwriteProtection(filepath, dst_path);

   console.debug(`Converting to WEBP <${filepath}>`);
   await util.execPromise(`cwebp \
	"${filepath}" \
	-o "${dst_path}"`);
   return dst_path;
}

async function convertToMP4(filepath) {
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

exports.toWEBP = convertToWEBP;
exports.toMP4 = convertToMP4;
exports.toWEBM = convertToWEBM;