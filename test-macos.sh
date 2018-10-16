#!/bin/bash

mkdir -p .test/src .test/dst
touch .config.ext.json

DEBUG=1 \
./cli.js \
--src .test/src \
--dst .test/dst \
--config .config.ext.json \
--force