# Tommy: Web Assets converter and optimizer

Tommy will process and optimize all your static assets ready for the web, no matter what the file extension happens to be;
and, to avoid wasting time, it will also save processed items so that unmodified assets will not be processed further.

Tommy also gives you the option of syncing all your processed assets to a S3 bucket.

## Pass runtime options

- `--src` specify the source directory (where your assets are located)
- `--dst` specify the destination directory (where your assets will be generated)
- `--force` regenerate all assets ignoring cache
- `--config` specify a JSON file containing an extension to the configuration

- `--webserver` will spawn an HTTP webserver that access via `POST /` a request to run
- `--port` is the webserver port (default: 80)

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
  "ignore": [".dockerignore"]
}
```

### First-level keys

| Key        | Type     | Applicable to | Description                  | Default           |
| ---------- | -------- | ------------- | ---------------------------- | ----------------- |
| ignore     | string[] | -             | Pattern to ignore            | _see config.json_ |
| remoteSync | bool     | -             | On/Off sync to remote bucket | false             |
| s3Bucket   | bool     | -             | S3 Bucket name               | null              |

## Enabling/Disabling services

By settings `enabled: false` in a key, you'll disable that service

| Key                                | Type | Applicable to | Description                     | Default |
| ---------------------------------- | ---- | ------------- | ------------------------------- | ------- |
| processor.resize.enabled           | bool | images        | various resized images          | true    |
| processor.image.enabled            | bool | images        | `imagemagick` processor         | true    |
| processor.lazyLoadBlurried.enabled | bool | images        | a blurry image                  | true    |
| converter.webp.enabled             | bool | images        | conversion to WEBP              | true    |
| tester.image.enabled               | bool | images        | sample HTML page to test        | true    |
| processor.jpg.enabled              | bool | JPGs          | `jpegoptim` optimizer           | true    |
| processor.png.enabled              | bool | PNGs          | `pngquant` optimizer            | true    |
| processor.gif.enabled              | bool | GIFs          | `gifsicle` optimizer            | true    |
| processor.svg.enabled              | bool | SVGs          | `svgo` optimizer                | true    |
| processor.poster.enabled           | bool | videos        | poster image                    | true    |
| processor.videoThumbs.enabled      | bool | videos        | thumbnails extracted from video | true    |
| converter.mp4.enabled              | bool | videos        | conversion to MP4               | true    |
| converter.webm.enabled             | bool | videos        | conversion to WEBM              | true    |
| tester.video.enabled               | bool | videos        | sample HTML page to test        | true    |
| converter.mp3.enabled              | bool | audios        | conversion to MP3               | true    |
| converter.ttf.enabled              | bool | TTFs/OTFs     | conversion to TTF               | true    |
| converter.otf.enabled              | bool | TTFs/OTFs     | conversion to OTF               | true    |
| converter.eot.enabled              | bool | TTFs/OTFs     | conversion to EOT               | true    |
| converter.svg.enabled              | bool | TTFs/OTFs     | conversion to SVG               | true    |
| converter.woff.enabled             | bool | TTFs/OTFs     | conversion to WOFF              | true    |
| converter.woff2.enabled            | bool | TTFs/OTFs     | conversion to WOFF2             | true    |
| tester.font.enabled                | bool | TTFs/OTFs     | sample HTML page to test        | true    |

### `processor.resize`

| Key               | Type     | Description                                       | Default                |
| ----------------- | -------- | ------------------------------------------------- | ---------------------- |
| resize.dimensions | number[] | Dimensions of resized images in PX (longest side) | [200,400,800,1200]     |
| resize.quality    | number   | Quality of images                                 | 80                     |
| resize.suffix     | string   | Suffix to apply to new files                      | "-resized-${i}.${ext}" |

### `image`

| Key           | Type   | Description      | Default |
| ------------- | ------ | ---------------- | ------- |
| image.quality | number | Quality of image | 80      |

### `videoThumbs`

| Key                 | Type   | Description                  | Default           |
| ------------------- | ------ | ---------------------------- | ----------------- |
| videoThumbs.count   | number | How many thumbnails extract  | 5                 |
| videoThumbs.size    | number | Length of longest side       | 400               |
| videoThumbs.quality | number | Quality of image             | 80                |
| videoThumbs.suffix  | string | Suffix to apply to new files | "-thumb-${i}.jpg" |

### `lazyLoadBlurried`

| Key                     | Type   | Description                  | Default         |
| ----------------------- | ------ | ---------------------------- | --------------- |
| lazyLoadBlurried.size   | number | Length of longest side       | 10              |
| lazyLoadBlurried.suffix | string | Suffix to apply to new files | "-blurried.jpg" |

### `poster`

| Key           | Type   | Description                  | Default       |
| ------------- | ------ | ---------------------------- | ------------- |
| poster.suffix | string | Suffix to apply to new files | "-poster.jpg" |

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

## Configure AWS credentials

To use the _remote sync_ feature, you need to configure the binary `aws` to locale credentials.

When using with docker, you can just share your `.awscredentials` file through a volume in the path `/root/.aws/credentials`.

Otherwise, you can configure your `aws` via `aws configure`.

Example file:

```txt
[default]
aws_access_key_id=...
aws_secret_access_key=...
```

To mount:

```sh
docker run
...
-v "$(pwd)/.awscredentials":"/root/.aws/credentials"
...
```

## License

MIT
