const test = require('tape')
const path = require('path')
const setup = require('./setup')
const config = require('./config')

test('add-torrent', function (t) {
  setup.resetTestDataDir()

  t.timeoutAfter(30e3)
  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Big Buck Bunny'))
    // Add an existing torrent. The corresponding file is not present. Should be at 0%
    .then(() => app.electron.ipcRenderer.send('openTorrentFile'))
    // The call to dialog.openFiles() is mocked. See mocks.js
    .then(() => app.client.waitUntilTextExists('m3.jpg'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'add-torrent-0-percent'))
    // Delete the torrent.
    .then(() => app.client.moveToObject('.torrent'))
    .then(() => setup.wait())
    .then(() => app.client.click('.icon.delete'))
    .then(() => app.client.waitUntilTextExists('REMOVE'))
    .then(() => app.client.click('.control.ok'))
    // Add the same existing torrent, this time with the file present. Should be at 100%
    .then(() => setup.copy(
      path.join(__dirname, 'resources', 'm3.jpg'),
      path.join(config.TEST_DIR_DOWNLOAD, 'm3.jpg')))
    .then(() => app.electron.ipcRenderer.send('openTorrentFile'))
    .then(() => app.client.waitUntilTextExists('m3.jpg'))
    .then(() => app.client.moveToObject('.torrent'))
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'add-torrent-100-percent'))
    .then(() => setup.endTest(app, t),
          (err) => setup.endTest(app, t, err || 'error'))
})

test('create-torrent', function (t) {
  setup.resetTestDataDir()

  // Set up the files to seed
  setup.copy(path.join(__dirname, 'resources', 'm3.jpg'), config.SEED_FILES[0])

  t.timeoutAfter(30e3)
  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Big Buck Bunny'))
    // Click the + button, open a non-torrent file to seed
    .then(() => app.client.click('.icon.add'))
    .then(() => app.client.waitUntilTextExists('Create'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'create-torrent-simple'))
    // Click to show advanced settings
    .then(() => app.client.click('.show-more .control'))
    .then(() => app.client.waitUntilTextExists('Comment'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'create-torrent-advanced'))
    // Click OK to create the torrent
    .then(() => app.client.click('.control.create-torrent'))
    .then(() => app.client.waitUntilTextExists('tmp.jpg'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'create-torrent-100-percent'))
    // Click "Save Torrent File As..." on the new torrent
    .then(() => app.webContents.executeJavaScript(
      'dispatch("saveTorrentFileAs", 6)'))
    .then(() => setup.wait())
    // Mock saves to <temp folder>/Desktop/saved.torrent
    .then(() => setup.compareTorrentFiles(t,
      config.SAVED_TORRENT_FILE,
      path.join(__dirname, 'resources', 'expected-single-file.torrent')))
    .then(() => setup.endTest(app, t),
          (err) => setup.endTest(app, t, err || 'error'))
})
