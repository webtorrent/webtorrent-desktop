#!/usr/bin/env node

var config = require('../src/config')
var open = require('open')

open(config.CONFIG_PATH)
