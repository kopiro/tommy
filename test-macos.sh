#!/bin/bash

mkdir -p .test/src .test/dst
touch .config.ext.json

tommy \
--src .test/src \
--dst .test/dst \
--config .config.ext.json \
--force