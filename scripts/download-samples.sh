#!/bin/bash

mkdir -p ".test/src"
pushd ".test/src"
for file in $(cat ../../scripts/samples.txt); do
    curl "$file" -O
done
popd