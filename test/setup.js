const path = require('path')
const Application = require('spectron').Application
const fs = require('fs-extra')

const TEST_DATA_DIR = path.join(__dirname, 'tempTestData')
const TEST_DOWNLOAD_DIR = path.join(TEST_DATA_DIR, 'Downloads')

module.exports = {
  TEST_DATA_DIR,
  TEST_DOWNLOAD_DIR,
  createApp,
  endTest,
  screenshotCreateOrCompare,
  compareDownloadFolder,
  waitForLoad,
  wait,
  wipeTestDataDir
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
function waitForLoad (app, t, opts) {
  if (!opts) opts = {}
  return app.start().then(function () {
    return app.client.waitUntilWindowLoaded()
  }).then(function () {
    // Offline mode? Disable internet in the webtorrent window
    // TODO. For now, just run integration tests with internet turned off.
    // Spectron is poorly documented, and contrary to the docs, webContents.session is missing
    // That is the correct API (in theory) to put the app in offline mode
  }).then(function () {
    // Switch to the main window. Index 0 is apparently the hidden webtorrent window...
    return app.client.windowByIndex(1)
  }).then(function () {
    return app.client.waitUntilWindowLoaded()
  }).then(function () {
    return app.webContents.getTitle()
  }).then(function (title) {
    // Note the window title is WebTorrent (BETA), this is the HTML <title>
    t.equal(title, 'Main Window', 'html title')
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
  const ssDir = path.join(__dirname, 'screenshots', process.platform)
  const ssPath = path.join(ssDir, name + '.png')
  fs.ensureFileSync(ssPath)
  const ssBuf = fs.readFileSync(ssPath)
  return app.browserWindow.capturePage().then(function (buffer) {
    if (ssBuf.length === 0) {
      console.log('Saving screenshot ' + ssPath)
      fs.writeFileSync(ssPath, buffer)
    } else {
      const match = Buffer.compare(buffer, ssBuf) === 0
      t.ok(match, 'screenshot comparison ' + name)
      if (!match) {
        const ssFailedPath = path.join(ssDir, name + '-failed.png')
        console.log('Saving screenshot, failed comparison: ' + ssFailedPath)
        fs.writeFileSync(ssFailedPath, buffer)
      }
    }
  })
}

// Resets the test directory, containing config.json, torrents, downloads, etc
function wipeTestDataDir () {
  fs.removeSync(TEST_DATA_DIR)
  fs.mkdirpSync(TEST_DOWNLOAD_DIR) // Downloads/ is inside of TEST_DATA_DIR
}

function compareDownloadFolder (t, dirname, filenames) {
  const dirpath = path.join(TEST_DOWNLOAD_DIR, dirname)
  try {
    const actualFilenames = fs.readdirSync(dirpath)
    const expectedSorted = filenames.slice().sort()
    const actualSorted = actualFilenames.slice().sort()
    t.deepEqual(actualSorted, expectedSorted, 'download folder contents: ' + dirname)
  } catch (e) {
    console.error(e)
    t.equal(filenames, null, 'download folder missing: ' + dirname)
  }
}
