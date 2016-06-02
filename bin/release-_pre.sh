#!/bin/sh
set -e

git pull
rm -rf node_modules/
npm install
npm dedupe
npm test
