#!/usr/bin/env node

/**
 * Remove all traces of WebTorrent.app from the system (config and temp files).
 * Useful for developers.
 */

var config = require('../config')
var os = require('os')
var path = require('path')
var pathExists = require('path-exists')
var rimraf = require('rimraf')

rimraf.sync(config.CONFIG_PATH)

var tmpPath = path.join(pathExists.sync('/tmp') ? '/tmp' : os.tmpDir(), 'webtorrent')
rimraf.sync(tmpPath)
