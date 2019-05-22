#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"

mkdir -p .test/src .test/dst
touch .config.ext.json

docker kill tommy
docker rm tommy

docker build -t $DOCKER_IMAGE . && \

docker run -t \
-v "$(pwd)/.test/src":"/src" \
-v "$(pwd)/.test/dst":"/dst" \
-v "$(pwd)/.config.ext.json":"/root/config.ext.json" \
-e "DEBUG=1" \
--name tommy \
kopiro/tommy \
--src "/src" \
--dst "/dst" \
--config "/root/config.ext.json" \
"$1"