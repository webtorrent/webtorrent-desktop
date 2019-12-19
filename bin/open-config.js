#!/usr/bin/env node

const { CONFIG_PATH } = require('../src/config')
const open = require('open')

open(CONFIG_PATH)
