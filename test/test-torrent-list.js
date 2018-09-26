const rimraf = require('rimraf')
const test = require('tape')

const config = require('./config')
const setup = require('./setup')

test('torrent-list: show download path missing', function (t) {
  setup.resetTestDataDir()
  rimraf.sync(config.TEST_DIR_DOWNLOAD)

  t.timeoutAfter(20e3)
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

test('torrent-list: start, stop, and delete torrents', function (t) {
  setup.resetTestDataDir()

  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Big Buck Bunny'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list'))
    // Click download on the first torrent, start downloading
    .then(() => app.client.click('.download input'))
    .then(() => app.client.waitUntilTextExists('.torrent-list', '276 MB'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-start-download'))
    // Click download on the first torrent again, stop downloading
    .then(() => app.client.click('.download input'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-download'))
    // Click delete on the first torrent
    .then(() => app.client.click('.icon.delete'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-delete-prompt'))
    // Click cancel on the resulting confirmation dialog. Should be same as before.
    .then(() => app.client.click('.control.cancel'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list'))
    // Click delete on the first torrent again
    .then(() => app.client.click('.icon.delete'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-delete-prompt'))
    // This time, click OK to confirm.
    .then(() => app.client.click('.control.ok'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-deleted'))
    .then(() => setup.endTest(app, t),
      (err) => setup.endTest(app, t, err || 'error'))
})

test('torrent-list: expand torrent, unselect file', function (t) {
  setup.resetTestDataDir()

  const app = setup.createApp()
  setup.waitForLoad(app, t)
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Big Buck Bunny'))
    // Click on the torrent, expand
    .then(() => app.client.click('#torrent-cosmos'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-cosmos-expand'))
    // Deselect the first file
    .then(() => app.client.click('#torrent-cosmos .icon.deselect-file'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-cosmos-expand-deselect'))
    // Start the torrent
    .then(() => app.client.click('#torrent-cosmos .download input'))
    .then(() => app.client.waitUntilTextExists('.torrent-list', '0%'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-cosmos-expand-start'))
    // TODO: individual files are not created until download initiates
    // Make sure that it creates all files EXCEPT the deslected one
    // .then(() => setup.compareDownloadFolder(t, 'CosmosLaundromatFirstCycle', [
    //   // TODO: the .gif should NOT be here, since we just deselected it.
    //   // This is a bug. See https://github.com/webtorrent/webtorrent-desktop/issues/719
    //   'Cosmos Laundromat - First Cycle (1080p).gif',
    //   'Cosmos Laundromat - First Cycle (1080p).mp4',
    //   'Cosmos Laundromat - First Cycle (1080p).ogv',
    //   'CosmosLaundromat-FirstCycle1080p.en.srt',
    //   'CosmosLaundromat-FirstCycle1080p.es.srt',
    //   'CosmosLaundromat-FirstCycle1080p.fr.srt',
    //   'CosmosLaundromat-FirstCycle1080p.it.srt',
    //   'CosmosLaundromatFirstCycle_meta.sqlite',
    //   'CosmosLaundromatFirstCycle_meta.xml'
    // ]))
    // Delete torrent plus data
    // Spectron doesn't have proper support for menu clicks yet...
    .then(() => app.webContents.executeJavaScript(
      'dispatch("confirmDeleteTorrent", "6a02592d2bbc069628cd5ed8a54f88ee06ac0ba5", true)'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-cosmos-delete-data'))
    // Click confirm
    .then(() => app.client.click('.control.ok'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'torrent-list-cosmos-deleted'))
    // Make sure that all the files are gone
    .then(() => setup.compareDownloadFolder(t, 'CosmosLaundromatFirstCycle', null))
    .then(() => setup.endTest(app, t),
      (err) => setup.endTest(app, t, err || 'error'))
})
