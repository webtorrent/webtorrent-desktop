const path = require('path')
const Application = require('spectron').Application
const fs = require('fs-extra')

const TEST_DATA_DIR = path.join(__dirname, 'tempTestData')

module.exports = {
  TEST_DATA_DIR,
  createApp,
  endTest,
  screenshotCreateOrCompare,
  waitForLoad,
  wait
}

// Runs WebTorrent Desktop.
// Returns a promise that resolves to a Spectron Application once the app has loaded.
// Takes a Tape test. Makes some basic assertions to verify that the app loaded correctly.
function createApp (t) {
  return new Application({
    path: path.join(__dirname, '..', 'node_modules', '.bin',
      'electron' + (process.platform === 'win32' ? '.cmd' : '')),
    args: [path.join(__dirname, '..')],
    env: {NODE_ENV: 'test'}
  })
}

// Starts the app, waits for it to load, returns a promise
function waitForLoad (app, t) {
  return app.start().then(function () {
    // Switch to the main window. Index 0 is apparently the hidden webtorrent window...
    return app.client.windowByIndex(1)
  }).then(function () {
    return app.client.waitUntilWindowLoaded()
  }).then(function () {
    return app.webContents.getTitle()
  }).then(function (title) {
    // Note the window title is WebTorrent (BETA), this is the HTML <title>
    t.equal(title, 'WebTorrent Desktop', 'html title')
  })
}

// Returns a promise that resolves after 'ms' milliseconds. Default: 500
function wait (ms) {
  if (ms === undefined) ms = 500 // Default: wait long enough for the UI to update
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, ms)
  })
}

// Quit the app, end the test, either in success (!err) or failure (err)
function endTest (app, t, err) {
  return app.stop().then(function () {
    t.end(err)
  })
}

// Takes a screenshot of the app
// If we already have a reference under test/screenshots, assert that they're the same
// Otherwise, create the reference screenshot: test/screenshots/<platform>/<name>.png
function screenshotCreateOrCompare (app, t, name) {
  const ssPath = path.join(__dirname, 'screenshots', process.platform, name + '.png')
  fs.ensureFileSync(ssPath)
  const ssBuf = fs.readFileSync(ssPath)
  return app.browserWindow.capturePage().then(function (buffer) {
    if (ssBuf.length === 0) {
      console.log('Saving screenshot ' + ssPath)
      fs.writeFileSync(ssPath, buffer)
    } else {
      t.ok(Buffer.compare(buffer, ssBuf) === 0, 'screenshot ' + name)
      return Promise.resolve()
    }
  })
}
