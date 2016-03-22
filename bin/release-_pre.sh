#!/bin/sh
set -e

git pull
npm run update-authors
git diff --exit-code
npm install
npm test
