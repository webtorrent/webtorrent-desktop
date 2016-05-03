#!/usr/bin/env node

var fs = require('fs')
var cp = require('child_process')

var BUILT_IN_DEPS = ['child_process', 'electron', 'fs', 'os', 'path', 'screen']
var EXECUTABLE_DEPS = ['gh-release', 'standard']

main()

// Scans our codebase and package.json for missing or unused dependencies
// Process returns 0 on success, prints a message and returns 1 on failure
function main () {
  if (process.platform === 'win32') {
    console.log('Sorry, check-deps only works on Mac and Linux')
    return
  }

  var jsDeps = findJSDeps()
  var packageDeps = findPackageDeps()

  var missingDeps = jsDeps.filter((dep) =>
    packageDeps.indexOf(dep) < 0 &&
    BUILT_IN_DEPS.indexOf(dep) < 0)
  var unusedDeps = packageDeps.filter((dep) =>
    jsDeps.indexOf(dep) < 0 &&
    EXECUTABLE_DEPS.indexOf(dep) < 0)

  if (missingDeps.length > 0) console.log('Missing package dependencies: ' + missingDeps)
  if (unusedDeps.length > 0) console.log('Unused package dependencies: ' + unusedDeps)

  if (missingDeps.length + unusedDeps.length > 0) process.exit(1)

  console.log('Lookin good!')
}

// Finds all dependencies, required, optional, or dev, in package.json
function findPackageDeps () {
  var pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  var requiredDeps = Object.keys(pkg.dependencies)
  var devDeps = Object.keys(pkg.devDependencies)
  var optionalDeps = Object.keys(pkg.optionalDependencies)

  return [].concat(requiredDeps, devDeps, optionalDeps)
}

// Finds all dependencies required() in the code
function findJSDeps () {
  var stdout = cp.execSync('./bin/list-deps.sh')
  return stdout.toString().trim().split('\n')
}
