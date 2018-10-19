#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"

mkdir -p .test/src .test/dst
touch .config.ext.json

docker build -t $DOCKER_IMAGE . && \

docker run -t \
-v "$(pwd)/.test/src":"/src" \
-v "$(pwd)/.test/dst":"/dst" \
-v "$(pwd)/.config.ext.json":"/root/config.ext.json" \
-v "$(pwd)/.awscredentials":"/root/.aws/credentials" \
-e "DEBUG=1" \
kopiro/tommy \
--src "/src" \
--dst "/dst" \
--config "/root/config.ext.json" \
$1