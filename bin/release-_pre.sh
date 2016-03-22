#!/bin/sh
set -e

git pull
npm run update-authors
git diff --exit-code
rm -rf node_modules/
npm install
npm test
