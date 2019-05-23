#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"
CONTAINER_NAME="kopiro-tommy"

mkdir -p .test/src .test/dst
if [ ! -f .config.ext.json ]; then
    echo "{}" > .config.ext.json
fi

docker kill "$CONTAINER_NAME" 
docker rm "$CONTAINER_NAME"
docker pull "$DOCKER_IMAGE"
docker build -t "$DOCKER_IMAGE" --cache-from "$DOCKER_IMAGE" .

docker run -t \
-v "$(pwd)/.test/src":"/src" \
-v "$(pwd)/.test/dst":"/dst" \
-v "$(pwd)/.config.ext.json":"/root/config.ext.json" \
-e "DEBUG=1" \
--name "$CONTAINER_NAME" \
kopiro/tommy \
--src "/src" \
--dst "/dst" \
--config "/root/config.ext.json" \
"$1"