const test = require('tape')
const fs = require('fs-extra')
const setup = require('./setup')

console.log('Creating download dir: ' + setup.TEST_DOWNLOAD_DIR)
fs.mkdirpSync(setup.TEST_DOWNLOAD_DIR)

test.onFinish(function () {
  console.log('Removing test dir: ' + setup.TEST_DATA_DIR)
  fs.removeSync(setup.TEST_DATA_DIR) // includes download dir
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

console.log('Testing the torrent list (home page)...')
setup.wipeTestDataDir()
require('./test-torrent-list')

// TODO:
// require('./test-add-torrent')
// require('./test-create-torrent')
// require('./test-prefs')
// require('./test-video')
// require('./test-audio')
// require('./test-cast')
