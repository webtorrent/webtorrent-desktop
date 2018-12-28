#!/usr/bin/env node

/**
 * Move files from src to build
 */

const fs = require('fs-extra')

fs.copySync('./src', './build')
console.log('Build done')