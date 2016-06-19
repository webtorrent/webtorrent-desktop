#!/usr/bin/env node

var fs = require('fs')
var cp = require('child_process')

// We can't use `builtin-modules` here since our TravisCI
// setup expects this file to run with no dependencies
var BUILT_IN_NODE_MODULES = [
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'zlib'
]

var BUILT_IN_ELECTRON_MODULES = [ 'electron' ]

var BUILT_IN_DEPS = [].concat(BUILT_IN_NODE_MODULES, BUILT_IN_ELECTRON_MODULES)

var EXECUTABLE_DEPS = ['gh-release', 'standard']

main()

// Scans codebase for missing or unused dependencies. Exits with code 0 on success.
function main () {
  if (process.platform === 'win32') {
    console.error('Sorry, check-deps only works on Mac and Linux')
    return
  }

  var usedDeps = findUsedDeps()
  var packageDeps = findPackageDeps()

  var missingDeps = usedDeps.filter(
    (dep) => !packageDeps.includes(dep) && !BUILT_IN_DEPS.includes(dep)
  )
  var unusedDeps = packageDeps.filter(
    (dep) => !usedDeps.includes(dep) && !EXECUTABLE_DEPS.includes(dep)
  )

  if (missingDeps.length > 0) {
    console.error('Missing package dependencies: ' + missingDeps)
  }
  if (unusedDeps.length > 0) {
    console.error('Unused package dependencies: ' + unusedDeps)
  }
  if (missingDeps.length + unusedDeps.length > 0) {
    process.exitCode = 1
  }
}

// Finds all dependencies specified in `package.json`
function findPackageDeps () {
  var pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

  var deps = Object.keys(pkg.dependencies)
  var devDeps = Object.keys(pkg.devDependencies)
  var optionalDeps = Object.keys(pkg.optionalDependencies)

  return [].concat(deps, devDeps, optionalDeps)
}

// Finds all dependencies that used with `require()`
function findUsedDeps () {
  var stdout = cp.execSync('./bin/list-deps.sh')
  return stdout.toString().trim().split('\n')
}
