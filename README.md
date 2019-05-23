# Tommy: Web Assets converter and optimizer

Tommy will process and optimize all your static assets ready for the web.

[![npm version](http://img.shields.io/npm/v/kopiro-tommy.svg?style=flat)](https://npmjs.org/package/kopiro-tommy "View this project on npm")
[![docker version](https://img.shields.io/docker/pulls/kopiro/tommy.svg)](https://hub.docker.com/r/kopiro/tommy)

<img width="80%" src="render.gif" />

## Arguments

- `--src` specify the source directory (where your assets are located)
- `--dst` specify the destination directory (where your assets will be generated)

### Optional argumenmts

- `--force` regenerate all assets ignoring cache
- `--config` specify a JSON file containing an extension to the configuration
- `--webserver` will spawn an HTTP webserver that access via `POST /` a request to run
- `--port` is the webserver port (default: 80)
- `--watch` will enable a persistent watch over the src directory to detect instant file changes

**⚡️️️ Always set `--dst` option to an empty directory: this directory should only be used by Tommy because files in could be potentially deleted if Tommy is started with a weird configuration or a corrupted database ⚡️**

## How to: run with Docker

The main advantage of using Tommy is that all dependencies used to process/convert entities are encapsulated into a docker image.

For this reason, you should use the `docker run` command to use Tommy in the original way it was created.

```sh
docker run \
-v "$(pwd)/test/src":/src \
-v "$(pwd)/test/dst":/dst \
-v "$(pwd)/config.json:/root/config.json" \
kopiro/tommy:latest \
--src /src \
--dst /dst \
--config /root/config.json
```

Explanation of mounts:

- `-v "$(pwd)/test/src":/src` mount the source directory (where your assets are located) into container `/src`
- `-v "$(pwd)/test/dst":/dst` mount the destination directory (where your assets will be generated) into container `/dst`
- `-v "$(pwd)/config.json:/root/config.json"` mount your (optional) configuration JSON file into container `/root/config.json`

### How to: run in MacOS

You can also use the native NPM package on OSX.

#### Installation

```sh
npm -g i kopiro-tommy
```

#### Run

```sh
tommy --src ./test/src --dst ./test/dst
```

## Configuration

By providing a JSON file to `--config`, you configuration will be extended with the default one.

```sh
tommy --config config.json
```

Example:

```json
{
  "processor.resize": {
    "enabled": false
  },
  "processor.resize": {
    "enabled": true,
    "suffix": "-resized-${i}.${ext}",
    "dimensions": [100, 300],
    "quality": 60
  },
  "ignore": [".dockerignore"]
}
```

### First-level keys

| Key    | Type     | Description       | Default           |
| ------ | -------- | ----------------- | ----------------- |
| ignore | string[] | Pattern to ignore | _see config.json_ |

## Enabling/Disabling services

By settings `enabled: false` in a key, you'll disable that service.

Example:

```json
...
"processor.resize": {
   "enabled": false
}
...
```

| Key                        | Applies to | Description                                                                                        |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| processor.resize           | images     | resize the image in differents formats                                                             |
| processor.image            | images     | optimize the image                                                                                 |
| processor.lazyLoadBlurried | images     | generates a very small blurried image that can be used before loading final image in lazy load.    |
| converter.webp             | images     | converts to WEBP format                                                                            |
| tester.image               | images     | generates a sample HTML page to test all differents formats                                        |
| processor.jpg              | JPGs       | optimizes the JPG using `jpegoptim`                                                                |
| processor.png              | PNGs       | optimizes the PNG using `pngquant`                                                                 |
| processor.gif              | GIFs       | optimizes the GIF using `gifsicle`                                                                 |
| processor.svg              | SVGs       | optimizes the SVG using `svgo`                                                                     |
| processor.poster           | videos     | generates a representative poster image from the video to use as picture before loading the video. |
| processor.videoThumbs      | videos     | generates N different thumbs from the video                                                        |
| processor.favicon          | favicon    | generates all images/icons needed in various browsers for the favicon.                             |
| converter.webm             | videos     | converts to WEBM format                                                                            |
| converter.h264_mp4         | videos     | converts to H264 using MP4 container                                                               |
| converter.av1_mp4          | videos     | converts to AV1 using MP4 container                                                                |
| converter.hevc_mp4         | videos     | converts to HEVC using MP4 container                                                               |
| tester.video               | videos     | generates a sample HTML page to test all differents formats                                        |
| converter.mp3              | audios     | converts to MP3 format                                                                             |
| converter.ttf              | fonts      | converts to TTF format                                                                             |
| converter.otf              | fonts      | converts to OTF format                                                                             |
| converter.eot              | fonts      | converts to EOT format                                                                             |
| converter.svg              | fonts      | converts to SVG format                                                                             |
| converter.woff             | fonts      | converts to WOFF format                                                                            |
| converter.woff2            | fonts      | converts to WOFF2 format                                                                           |
| tester.font                | fonts      | generates a sample HTML page to test all differents formats                                        |

### `processor.resize`

| Key        | Type     | Description                                       | Default                |
| ---------- | -------- | ------------------------------------------------- | ---------------------- |
| dimensions | number[] | Dimensions of resized images in PX (longest side) | [200,400,800,1200]     |
| quality    | number   | Quality of images                                 | 80                     |
| suffix     | string   | Suffix to Applies to new files                    | "-resized-${i}.${ext}" |

### `processor.image`

| Key     | Type   | Description      | Default |
| ------- | ------ | ---------------- | ------- |
| quality | number | Quality of image | 80      |

### `processor.videoThumbs`

| Key     | Type   | Description                    | Default            |
| ------- | ------ | ------------------------------ | ------------------ |
| count   | number | How many thumbnails extract    | 5                  |
| size    | number | Length of longest side         | 400                |
| quality | number | Quality of image               | 80                 |
| suffix  | string | Suffix to Applies to new files | "-thumb-\${i}.jpg" |

### `processor.lazyLoadBlurried`

| Key    | Type   | Description                    | Default         |
| ------ | ------ | ------------------------------ | --------------- |
| size   | number | Length of longest side         | 10              |
| suffix | string | Suffix to Applies to new files | "-blurried.jpg" |

### `processor.poster`

| Key    | Type   | Description                    | Default       |
| ------ | ------ | ------------------------------ | ------------- |
| suffix | string | Suffix to Applies to new files | "-poster.jpg" |

### `processor.favicon`

| Key           | Type   | Description                                                                             | Default           |
| ------------- | ------ | --------------------------------------------------------------------------------------- | ----------------- |
| webmanifest   | object | JSON object to extend for the `site.webmanifest`. Set to `false` to disable generation. | _see config.json_ |
| browserconfig | bool   | Set to `false` to disable generation of `browserconfig.xml`                             | true              |
| test          | bool   | Set to `false` to disable HTML test page (`favicon.html`)                               | true              |
| tileColor     | string | Color of the tile for Windows                                                           | "#336699"         |
| themeColor    | string | Color of the theme for Chrome Mobile                                                    | "#336699"         |

## convert.{webm,\*\_mp4}

_These are the general settings used for video. You can override manually in every section_

| Key         | Type   | Description                                                                                                   | Default      |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------- | ------------ |
| audioCodec  | string | The coded to use for audio                                                                                    | null         |
| crf         | number | The range of the CRF scale is 0–51, where 0 is lossless, 23 is the default, and 51 is worst quality possible. | 23           |
| pixelFormat | string | It uses full resolution for brightness and a smaller resolution for color.                                    | "yuv420p"    |
| mapMetadata | string | Choose to keep/remove metadata                                                                                | "-1"         |
| movFlags    | string | Movie flags to pass to ffmpeg                                                                                 | "+faststart" |
| preset      | string | Will provide a certain encoding speed to compression ratio.                                                   | "veryslow"   |

### `converter.webm`

| Key        | Type   | Description           | Default      |
| ---------- | ------ | --------------------- | ------------ |
| videoCodec | string | _see general section_ | "libvpx-vp9" |

### `converter.h264_mp4`

| Key        | Type   | Description           | Default   |
| ---------- | ------ | --------------------- | --------- |
| videoCodec | string | _see general section_ | "libx264" |

### `converter.av1_mp4`

| Key        | Type   | Description                                                                                 | Default      |
| ---------- | ------ | ------------------------------------------------------------------------------------------- | ------------ |
| videoCodec | string | _see general section_                                                                       | "libaom-av1" |
| audioCoded | string | _see general section_                                                                       | "libopus"    |
| crf        | number | _see general section_ (note: this value is higher due te different scale of this algorithm) | 50           |

### `converter.hvec_mp4`

| Key        | Type   | Description                | Default   |
| ---------- | ------ | -------------------------- | --------- |
| videoCodec | string | The coded to use for video | "libx265" |

## How: build locally Docker image

Download the repository, then run `./test-docker.sh`.

It will build the Docker image locally and test with test present in current repository.

## License

MIT
