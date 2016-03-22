#!/bin/sh
set -e
BIN=`dirname $0`

$BIN/release-_pre.sh
npm version minor
$BIN/release-_post.sh
