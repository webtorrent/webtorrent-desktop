#!/usr/bin/env node

var electron = require('electron-prebuilt')
var proc = require('child_process')
var path = require('path')

var child = proc.spawn(electron, [path.join(__dirname, '..')], {stdio: 'inherit'})
child.on('close', function (code) {
  process.exit(code)
})
