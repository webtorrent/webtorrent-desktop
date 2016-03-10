#!/usr/bin/env node

/**
 * Remove all traces of WebTorrent.app from the system (config and temp files).
 * Useful for developers.
 */

var applicationConfigPath = require('application-config-path')
var config = require('../config')
var os = require('os')
var path = require('path')
var pathExists = require('path-exists')
var rimraf = require('rimraf')

var tmpPath = path.join(pathExists.sync('/tmp') ? '/tmp' : os.tmpDir(), 'webtorrent')
var configPath = applicationConfigPath(config.APP_NAME)

rimraf.sync(configPath)
rimraf.sync(tmpPath)
