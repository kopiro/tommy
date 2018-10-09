#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"

docker build -t $DOCKER_IMAGE . && \

docker run -t \
-v "$(pwd)/volumes/src":/src \
-v "$(pwd)/volumes/dst":/dst \
kopiro/tommy \
--src /src \
--dst /dst