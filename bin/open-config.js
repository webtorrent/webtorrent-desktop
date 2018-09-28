#!/usr/bin/env node

const { CONFIG_PATH } = require('../src/config')
const opn = require('opn')

opn(CONFIG_PATH)
