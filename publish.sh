#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"
NPM_VERSION=$(node -e 'process.stdout.write(require("./package.json").version)')

npm publish

docker build -t "$DOCKER_IMAGE:$NPM_VERSION" . && \
docker push "$DOCKER_IMAGE:$NPM_VERSION"