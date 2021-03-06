#!/bin/bash
if [ "$(uname)" == "Darwin" ]; then
    brew install imagemagick
    brew install jpegoptim
    brew install pngquant
    brew install webp
    brew install ffmpeg
    npm -g i svgo
    brew install fontforge
    brew install woff2
    brew install aws-cli
    npm -g install less
    npm -g install sass
fi