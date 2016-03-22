#!/bin/sh
set -e
BIN=`dirname $0`

$BIN/release-_pre.sh
npm version major
$BIN/release-_post.sh
