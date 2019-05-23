#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"
NPM_VERSION=$(node -e 'process.stdout.write(require("./package.json").version)')

docker pull "$DOCKER_IMAGE" &&
docker build --cache-from "$DOCKER_IMAGE" -t "$DOCKER_IMAGE:$NPM_VERSION" . && \
docker push "$DOCKER_IMAGE:$NPM_VERSION" && \

docker tag "$DOCKER_IMAGE:$NPM_VERSION" "$DOCKER_IMAGE:latest" && \
docker push "$DOCKER_IMAGE:latest"