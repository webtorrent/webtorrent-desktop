#!/usr/bin/env node

const walkSync = require('walk-sync')
const fs = require('fs')
const path = require('path')

let hasErrors = false

// Find all Javascript source files
var files = walkSync('src', {globs: ['**/*.js']})
console.log('Running extra-lint on ' + files.length + ' files...')

// Read each file, line by line
files.forEach(function (file) {
  var filepath = path.join('src', file)
  var lines = fs.readFileSync(filepath, 'utf8').split('\n')

  lines.forEach(function (line, i) {
    var error

    // Consistent JSX tag closing
    if (line.match(/' {2}\/> *$/) ||
      line.match('[^ ]/> *$') ||
      line.match(' > *$')) {
      error = 'JSX tag spacing'
    }

    // No lines over 100 characters
    if (line.length > 100) {
      error = 'Line >100 chars'
    }

    if (line.match(/^var /) || line.match(/ var /)) {
      error = 'Use const or let'
    }

    if (error) {
      let name = path.basename(file)
      console.log('%s:%d - %s:\n%s', name, i + 1, error, line)
      hasErrors = true
    }
  })
})

if (hasErrors) process.exit(1)
else console.log('Looks good!')
