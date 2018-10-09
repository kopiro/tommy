#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"
NPM_VERSION=$(node -e 'process.stdout.write(require("./app/package.json").version)')

pushd ./app && \
npm publish && \
popd

docker build -t "$DOCKER_IMAGE:$NPM_VERSION" . && \
docker push "$DOCKER_IMAGE:$NPM_VERSION"