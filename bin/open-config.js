#!/usr/bin/env node

var config = require('../config')
var open = require('open')

open(config.CONFIG_PATH)
