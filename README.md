# Tommy: Web Assets converter and optimizer

Tommy will process and optimize all your static assets ready for the web.

<img width="80%" src="render.gif" />

## Pass runtime options

- `--src` specify the source directory (where your assets are located)
- `--dst` specify the destination directory (where your assets will be generated)
- `--force` regenerate all assets ignoring cache
- `--config` specify a JSON file containing an extension to the configuration

- `--webserver` will spawn an HTTP webserver that access via `POST /` a request to run
- `--port` is the webserver port (default: 80)

- `--watch` will enable a persistent watch over the src directory to detect instant file changes

### ⚡️️️ Always set `--dst` option to an empty directory: this directory should only be used by Tommy because files in could be potentially deleted if Tommy is started with a weird configuration or a corrupted database ⚡️

## Configuration

If you pass to Tommy an additional JSON file, it will be merged with initial config.

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

| Key                        | Applicable to | Description                           | Enabled dy default |
| -------------------------- | ------------- | ------------------------------------- | ------------------ |
| processor.resize           | images        | various resized images                | true               |
| processor.image            | images        | `imagemagick` processor               | true               |
| processor.lazyLoadBlurried | images        | a blurry image                        | true               |
| converter.webp             | images        | conversion to WEBP                    | true               |
| tester.image               | images        | sample HTML page to test              | true               |
| processor.jpg              | JPGs          | `jpegoptim` optimizer                 | true               |
| processor.png              | PNGs          | `pngquant` optimizer                  | true               |
| processor.gif              | GIFs          | `gifsicle` optimizer                  | true               |
| processor.svg              | SVGs          | `svgo` optimizer                      | true               |
| processor.poster           | videos        | poster image                          | true               |
| processor.videoThumbs      | videos        | thumbnails extracted from video       | true               |
| processor.favicon          | favicon       | generate all files needed for favicon | true               |
| converter.webm             | videos        | conversion to WEBM                    | true               |
| converter.h264_mp4         | videos        | conversion to H264 and MP4 container  | true               |
| converter.av1_mp4          | videos        | conversion to AV1 and MP4 container   | true               |
| converter.hevc_mp4         | videos        | conversion to HEVC and MP4 container  | true               |
| tester.video               | videos        | sample HTML page to test              | true               |
| converter.mp3              | audios        | conversion to MP3                     | true               |
| converter.ttf              | fonts         | conversion to TTF                     | true               |
| converter.otf              | fonts         | conversion to OTF                     | true               |
| converter.eot              | fonts         | conversion to EOT                     | true               |
| converter.svg              | fonts         | conversion to SVG                     | true               |
| converter.woff             | fonts         | conversion to WOFF                    | true               |
| converter.woff2            | fonts         | conversion to WOFF2                   | true               |
| tester.font                | fonts         | sample HTML page to test              | true               |

### `processor.resize`

| Key        | Type     | Description                                       | Default                |
| ---------- | -------- | ------------------------------------------------- | ---------------------- |
| dimensions | number[] | Dimensions of resized images in PX (longest side) | [200,400,800,1200]     |
| quality    | number   | Quality of images                                 | 80                     |
| suffix     | string   | Suffix to apply to new files                      | "-resized-${i}.${ext}" |

### `processor.image`

| Key     | Type   | Description      | Default |
| ------- | ------ | ---------------- | ------- |
| quality | number | Quality of image | 80      |

### `processor.videoThumbs`

| Key     | Type   | Description                  | Default            |
| ------- | ------ | ---------------------------- | ------------------ |
| count   | number | How many thumbnails extract  | 5                  |
| size    | number | Length of longest side       | 400                |
| quality | number | Quality of image             | 80                 |
| suffix  | string | Suffix to apply to new files | "-thumb-\${i}.jpg" |

### `processor.lazyLoadBlurried`

| Key    | Type   | Description                  | Default         |
| ------ | ------ | ---------------------------- | --------------- |
| size   | number | Length of longest side       | 10              |
| suffix | string | Suffix to apply to new files | "-blurried.jpg" |

### `processor.poster`

| Key    | Type   | Description                  | Default       |
| ------ | ------ | ---------------------------- | ------------- |
| suffix | string | Suffix to apply to new files | "-poster.jpg" |

### `processor.favicon`

| Key           | Type   | Description                                                                             | Default           |
| ------------- | ------ | --------------------------------------------------------------------------------------- | ----------------- |
| webmanifest   | object | JSON object to extend for the `site.webmanifest`. Set to `false` to disable generation. | _see config.json_ |
| browserconfig | bool   | Set to `false` to disable generation of `browserconfig.xml`                             | true              |
| test          | bool   | Set to `false` to disable HTML test page (`favicon.html`)                               | true              |
| tileColor     | string | Color of the tile for Windows                                                           | "#336699"         |
| themeColor    | string | Color of the theme for Chrome Mobile                                                    | "#336699"         |

## convert.[webm,*_mp4]

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

## How to: run with Docker

I suggest you to use with Docker to avoid installing all dependencies in your host.

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

## How to: run in MacOS

Upfront, install dependencies by running `macos.sh`, then install with NPM:

```sh
npm -g i kopiro-tommy
```

Then run as a binary:

```sh
tommy --src ./test/src --dst ./test/dst
```

## How: build locally Docker image

Download the repository, then run `./test-docker.sh`.

It will build the Docker image locally and test with test present in current repository.

## License

MIT
