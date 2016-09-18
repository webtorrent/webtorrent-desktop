const test = require('tape')
const setup = require('./setup')

test('audio-streaming', function (t) {
  setup.resetTestDataDir()

  t.timeoutAfter(60e3)
  const app = setup.createApp()
  setup.waitForLoad(app, t, {online: true})
    .then(() => app.client.waitUntilTextExists('.torrent-list', 'Big Buck Bunny'))
    // Play Wired CD. Wait for it to start streaming.
    .then(() => app.client.moveToObject('#torrent-wired'))
    .then(() => setup.wait())
    .then(() => app.client.click('#torrent-wired .icon.play'))
    .then(() => app.client.waitUntilTextExists('The Wired CD'))
    // Pause. Skip to two seconds in. Wait another two seconds for it to load.
    .then(() => app.webContents.executeJavaScript('dispatch("playPause")'))
    .then(() => app.webContents.executeJavaScript('dispatch("skipTo", 2)'))
    .then(() => setup.wait())
    .then(() => app.client.waitUntilTextExists('Artist'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-wired'))
    // Click next
    .then(() => app.client.click('.skip-next'))
    .then(() => app.client.waitUntilTextExists('The Wired CD'))
    .then(() => app.client.moveToObject('.letterbox'))
    .then(() => app.webContents.executeJavaScript('dispatch("playPause")'))
    .then(() => app.webContents.executeJavaScript('dispatch("skipTo", 2)'))
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-wired-2'))
    // Play from end of song, let it advance on its own
    .then(() => app.webContents.executeJavaScript('dispatch("skipTo", 206)'))
    .then(() => app.webContents.executeJavaScript('dispatch("playPause")'))
    .then(() => setup.wait(5e3)) // Let it play a few seconds, past the end of the song
    .then(() => app.webContents.executeJavaScript('dispatch("playPause")'))
    .then(() => app.webContents.executeJavaScript('dispatch("skipTo", 2)'))
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-wired-3'))
    // Fullscreen
    .then(() => app.client.click('.fullscreen'))
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-wired-fullscreen'))
    // Back to normal audio view. Give the player controls have had time to disappear.
    .then(() => app.webContents.executeJavaScript('dispatch("escapeBack")'))
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-wired-4'))
    // Back. Return to torrent list
    .then(() => app.client.click('.back'))
    .then(() => app.client.waitUntilTextExists('Big Buck Bunny'))
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-wired-list'))
    // Forward. Should play again where we left off (should not stay paused)
    .then(() => app.client.click('.forward'))
    .then(() => setup.wait())
    .then(() => app.webContents.executeJavaScript('dispatch("playPause")'))
    .then(() => app.webContents.executeJavaScript('dispatch("skipTo", 2)'))
    .then(() => setup.wait())
    .then(() => setup.screenshotCreateOrCompare(app, t, 'play-torrent-wired-5'))
    .then(() => setup.endTest(app, t),
          (err) => setup.endTest(app, t, err || 'error'))
})
