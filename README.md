# Tommy: Web Assets converter and optimizer

Tommy will process and optimize all your static assets ready for the web no matter what is the file extensions.

It will cache yet processed files so that future executions will be fast.

You can optionally configure Tommy to upload all your processed assets to a S3 bucket.

### Handled files

- `jpg, jpeg` will be converted with `imagemagick` and optimized with `jpegoptim`
- `png` will be converted with `imagemagick` and optimized with `pngquant`
- `gif` will be optimized with `gifsicle`
- `svg` will be optimized with `svgo`

- _JPG/PNG files_ will be _resized_ and optimized in multiple images using `imagemagick`
- _Video files_ will be converted to `mp4, webm` using `ffmpeg`
- For _Video files_ will be extracted a poster using `ffmpeg`

- _All other static assets_ will be just copied and remain untouched

### Configuration

If you pass to Tommy an additiona JSON file, it will be merged with initial config.

```
tommy --config config.json
```

## How to: run with Docker

```
docker run \
-v "$(pwd)/volumes/src":/src \
-v "$(pwd)/volumes/dst":/dst \
kopiro/tommy \
--src /src \
--dst /dst
```

## How to: run in MacOS

Upfront, install dependencies by running `macos.sh`.

Install with NPM:

```
npm -g i tommy
```

Then run as a binary:

```
tommy --src ./volumes/src --dst ./volumes/dst
```

## License

MIT
