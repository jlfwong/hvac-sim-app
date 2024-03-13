#!/bin/bash
set -euox pipefail

rm -rf dist/*
mkdir -p dist
cp -R static/* dist
npm run build