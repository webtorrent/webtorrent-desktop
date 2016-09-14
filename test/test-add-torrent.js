const test = require('tape')
const fs = require('fs-extra')
const path = require('path')
const setup = require('./setup')

test('add-torrent', function (t) {
  setup.wipeTestDataDir()

  t.timeoutAfter(100e3)
  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Big Buck Bunny'))
    // Add an existing torrent. The corresponding file is not present. Should be at 0%
    .then(() => app.client.click('.icon.add'))
    // The call to dialog.openFiles() is mocked. See mocks.js
    .then(() => app.client.waitUntilTextExists('m3.jpg'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'add-torrent-existing-1'))
    // Delete the torrent.
    .then(() => app.client.moveToObject('.torrent'))
    .then(() => setup.wait())
    .then(() => app.client.click('.icon.delete'))
    .then(() => app.client.waitUntilTextExists('REMOVE'))
    .then(() => app.client.click('.control.ok'))
    .then(() => setup.wait())
    // Add the same existing torrent, this time with the file present. Should be at 100%
    .then(() => fs.copySync(
      path.join(__dirname, 'resources', 'm3.jpg'),
      path.join(setup.TEST_DOWNLOAD_DIR, 'm3.jpg')))
    .then(() => app.client.click('.icon.add'))
    .then(() => app.client.waitUntilTextExists('m3.jpg'))
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'add-torrent-existing-2'))
    .then(() => setup.endTest(app, t),
          (err) => setup.endTest(app, t, err || 'error'))
})
