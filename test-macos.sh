#!/bin/bash

mkdir -p .test/src .test/dst
touch .config.ext.json

./cli.js \
--src .test/src \
--dst .test/dst \
--config .config.ext.json \
$1