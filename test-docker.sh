#!/bin/bash

DOCKER_IMAGE="kopiro/tommy"

docker build -t $DOCKER_IMAGE . && \

docker run -t \
-v "$(pwd)/test/src":"/src" \
-v "$(pwd)/test/dst":"/dst" \
-v "$(pwd)/config.json":"/root/config.json" \
-v "$(pwd)/.awscredentials":"/root/.aws/credentials" \
kopiro/tommy \
--src "/src" \
--dst "/dst" \
--config "/root/config.json"