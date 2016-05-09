#!/usr/bin/env node

var config = require('../config')
var open = require('open')
var path = require('path')

var configPath = path.join(config.CONFIG_PATH, 'config.json')
open(configPath)
