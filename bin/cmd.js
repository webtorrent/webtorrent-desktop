#!/usr/bin/env node

var electron = require('electron')
var cp = require('child_process')
var path = require('path')

var child = cp.spawn(electron, [path.join(__dirname, '..')], {stdio: 'inherit'})
child.on('close', function (code) {
  process.exitCode = code
})
