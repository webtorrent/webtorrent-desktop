const test = require('tape')
const fs = require('fs-extra')
const path = require('path')
const setup = require('./setup')

console.log('Creating test dir: ' + setup.TEST_DATA_DIR)
const DOWNLOAD_DIR = path.join(setup.TEST_DATA_DIR, 'Downloads')
fs.mkdirpSync(DOWNLOAD_DIR)

test.onFinish(function () {
  console.log('Removing test dir...')
  fs.removeSync(setup.TEST_DATA_DIR)
})

test('app runs', function (t) {
  t.timeoutAfter(10e3)
  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-basic'))
    .then(() => setup.endTest(app, t),
          (err) => setup.endTest(app, t, err || 'error'))
})

test('show download path missing', function (t) {
  fs.removeSync(DOWNLOAD_DIR)

  t.timeoutAfter(10e3)
  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => app.client.getTitle())
    .then((text) => console.log('Title ' + text))
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Download path missing'))
    .then((err) => t.notOk(err))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-download-path-missing'))
    .then(() => app.client.click('a'))
    .then(() => setup.wait())
    .then(() => app.browserWindow.getTitle())
    .then((windowTitle) => t.equal(windowTitle, 'Preferences', 'window title'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'prefs-basic'))
    .then(() => setup.endTest(app, t),
          (err) => setup.endTest(app, t, err || 'error'))
})

// TODO:
// require('./test-torrent-list')
// require('./test-add-torrent')
// require('./test-create-torrent')
// require('./test-prefs')
// require('./test-video')
// require('./test-audio')
// require('./test-cast')
