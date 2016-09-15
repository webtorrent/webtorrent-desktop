const test = require('tape')
const setup = require('./setup')

test('basic-streaming', function (t) {
  setup.resetTestDataDir()

  t.timeoutAfter(30e3)
  const app = setup.createApp()
  setup.waitForLoad(app, t, {online: true})
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Big Buck Bunny'))
    // Play Big Buck Bunny. Wait for it to start streaming.
    .then(() => app.client.moveToObject('.torrent.bbb'))
    .then(() => setup.wait())
    .then(() => app.client.click('.icon.play'))
    .then(() => setup.wait(10e3))
    // Pause. Skip to two seconds in. Wait another two seconds for it to load.
    .then(() => app.webContents.executeJavaScript('dispatch("playPause")'))
    .then(() => app.webContents.executeJavaScript('dispatch("skipTo", 2)'))
    .then(() => setup.wait(5e3))
    // Take a screenshot to verify video playback
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-bbb'))
    // Hit escape
    .then(() => app.webContents.executeJavaScript('dispatch("escapeBack")'))
    .then(() => setup.wait())
    // Delete Big Buck Bunny
    .then(() => app.client.click('.icon.delete'))
    .then(() => setup.wait())
    .then(() => app.client.click('.control.ok'))
    .then(() => setup.wait())
    // Take another screenshot to verify that the window resized correctly
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-return'))
    .then(() => setup.endTest(app, t),
          (err) => setup.endTest(app, t, err || 'error'))
})
