#!/bin/sh
set -e

npm run update-authors
git diff --exit-code
npm run package -- --sign
git push
git push --tags
npm publish
./node_modules/.bin/gh-release
