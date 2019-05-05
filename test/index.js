const test = require('tape')
const setup = require('./setup')

test.onFinish(setup.deleteTestDataDir)

test('app runs', function (t) {
  t.timeoutAfter(10e3)
  setup.resetTestDataDir()
  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => setup.screenshotCreateOrCompare(app, t, 'app-basic'))
    .then(() => setup.endTest(app, t),
      (err) => setup.endTest(app, t, err || 'error'))
})

require('./test-torrent-list')
require('./test-add-torrent')
require('./test-video')
require('./test-audio')
