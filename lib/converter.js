const util = require("./util");

const FFMPEG_BASE_FLAGS = "-y -hide_banner";

const FFMPEG_ARGS_TRANS = {
  videoCodec: "c:v",
  audioCodec: "c:a",
  pixelFormat: "pix_fmt",
  mapMetadata: "map_metadata",
  movFlags: "movflags",
  preset: "preset"
};

async function convertUsingFfmpeg(input, output, args = {}, devArgs = {}) {
  args = Object.assign(
    {},
    {
      videoCodec: null,
      audioCodec: null,
      crf: 23,
      mapMetadata: "-1",
      preset: "veryslow",
      pixelFormat: "yuv420p",
      movFlags: "+faststart"
    },
    args
  );

  devArgs = Object.assign(
    {},
    {
      loglevel: "fatal",
      vf: "scale=trunc(iw/2)*2:trunc(ih/2)*2"
    },
    devArgs
  );

  let argsArray = [];
  Object.keys(args).reduce((carry, k) => {
    if (args[k] != null && k in FFMPEG_ARGS_TRANS) {
      carry.push(`-${FFMPEG_ARGS_TRANS[k]} "${args[k]}"`);
    }
    return carry;
  }, argsArray);
  Object.keys(devArgs).reduce((carry, k) => {
    carry.push(`-${k} "${devArgs[k]}"`);
    return carry;
  }, argsArray);

  return util.execPromise(
    `ffmpeg ${FFMPEG_BASE_FLAGS} -i "${input}" ${argsArray.join(
      " "
    )} "${output}"`
  );
}

async function convertUsingFontForge(tommy, format, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, `.${format}`);
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to ${format.toUpperCase()} <${dst_path}>`);
  await util.execPromise(`FONTFORGE_LANGUAGE=ff fontforge -quiet \
		-c 'Open("${filepath}"); Generate("${dst_path}")'`);
  return dst_path;
}

// Images

async function convertToWEBP(tommy, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, ".webp");
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to WEBP <${dst_path}>`);
  await util.execPromise(`cwebp -mt \
		"${filepath}" \
		-o "${dst_path}"`);
  return dst_path;
}

// Audio

async function convertToMP3(tommy, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, ".mp3");
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to MP3 <${dst_path}>`);
  await util.execPromise(`ffmpeg ${FFMPEG_BASE_FLAGS} \
      -i "${filepath}" \
      "${dst_path}"`);
  return dst_path;
}

// Fonts

async function convertToOTF(tommy, filepath) {
  return convertUsingFontForge(tommy, "otf", filepath);
}

async function convertToTTF(tommy, filepath) {
  return convertUsingFontForge(tommy, "ttf", filepath);
}

async function convertToSVG(tommy, filepath) {
  return convertUsingFontForge(tommy, "svg", filepath);
}

async function convertToEOT(tommy, filepath) {
  return convertUsingFontForge(tommy, "eot", filepath);
}

async function convertToWOFF(tommy, filepath) {
  return convertUsingFontForge(tommy, "woff", filepath);
}

async function convertToWOFF2(tommy, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, ".woff");
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to WOFF2 <${dst_path}>`);
  await util.execPromise(`woff2_compress \
		"${filepath}"`);
  return dst_path;
}

// Videos

async function convertToWEBM(tommy, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, ".webm");
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to WEBM <${dst_path}>`);
  await convertUsingFfmpeg(filepath, dst_path, tommy.config["converter.webm"]);
  return dst_path;
}

async function convertToH264MP4(tommy, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, ".h264.mp4");
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to H264 <${dst_path}>`);

  await convertUsingFfmpeg(
    filepath,
    dst_path,
    tommy.config["converter.h264_mp4"],
    {
      "profile:v": "main" // We use in our H.264 command selects the video codec profile - we can only use “Main”, as our video will not be played in Safari otherwise.
    }
  );
  return dst_path;
}

async function convertToAV1MP4(tommy, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, ".av1.mp4");
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to AV1 <${dst_path}>`);
  await convertUsingFfmpeg(
    filepath,
    dst_path,
    tommy.config["converter.av1_mp4"],
    {
      "b:v": 0,
      strict: "experimental"
    }
  );
  return dst_path;
}

async function convertToHEVCMP4(tommy, filepath) {
  const dst_path = filepath.replace(util.REGEX_EXT, ".hevc.mp4");
  await util.overwriteProtection(tommy, filepath, dst_path);

  console.debug(`Converting to HEVC <${dst_path}>`);
  await convertUsingFfmpeg(
    filepath,
    dst_path,
    tommy.config["converter.hevc_mp4"],
    {
      "tag:v": "hvc1" // enables native HEVC video support on Apple operating systems.
    }
  );
  return dst_path;
}

// Expose

module.exports = {
  webp: convertToWEBP,

  mp3: convertToMP3,

  otf: convertToOTF,
  ttf: convertToTTF,
  svg: convertToSVG,
  eot: convertToEOT,
  woff: convertToWOFF,
  woff2: convertToWOFF2,

  webm: convertToWEBM,
  h264_mp4: convertToH264MP4,
  av1_mp4: convertToAV1MP4,
  hevc_mp4: convertToHEVCMP4
};
