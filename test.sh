#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"

docker build -t $DOCKER_IMAGE . && \
docker run \
-v "$(pwd)/volumes/src":/src \
-v "$(pwd)/volumes/dst":/dst \
$DOCKER_IMAGE 