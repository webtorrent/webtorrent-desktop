module.exports = {
  init
}

var electron = require('electron')

var config = require('../config')

// var app = electron.app
var autoUpdater = electron.autoUpdater

function init () {
  autoUpdater.on('error', function (err) {
    console.error('error downloading app update', err.message || err)
  })

  autoUpdater.setFeedURL(config.AUTO_UPDATE_URL)

  // TODO: remove
  autoUpdater.checkForUpdates()

  /*
   * We always check for updates on app startup. To keep app startup fast, we delay this
   * first check so it happens when there is less going on.
   */
  setTimeout(() => autoUpdater.checkForUpdates(), config.AUTO_UPDATE_CHECK_STARTUP_DELAY)

  /*
   * After the first check for updates, we continually check for updates on a regular
   * interval. This is to ensure that checks happen even when the app is left open for a
   * long time.
   */
  setInterval(() => autoUpdater.checkForUpdates(), config.AUTO_UPDATE_CHECK_INTERVAL)

  autoUpdater.on('checking-for-update', () => console.log('checking for app update'))
  autoUpdater.on('update-available', () => console.log('app update available'))
  autoUpdater.on('update-not-available', () => console.log('app update not available'))
  autoUpdater.on('update-downloaded', function (e) {
    console.log('app update downloaded', e)
  })
}
