#!/bin/sh
set -e

npm run update-authors
git diff --exit-code
npm run package -- --sign
git push
git push --tags
npm publish
npm run gh-release
