module.exports = {
  init
}

var electron = require('electron')

var config = require('../config')
var log = require('./log')

var autoUpdater = electron.autoUpdater

function init () {
  autoUpdater.on('error', function (err) {
    log.error('App update error: ' + err.message || err)
  })

  autoUpdater.setFeedURL(config.AUTO_UPDATE_URL)

  /*
   * We always check for updates on app startup. To keep app startup fast, we delay this
   * first check so it happens when there is less going on.
   */
  setTimeout(() => autoUpdater.checkForUpdates(), config.AUTO_UPDATE_CHECK_STARTUP_DELAY)

  autoUpdater.on('checking-for-update', () => log('Checking for app update'))
  autoUpdater.on('update-available', () => log('App update available'))
  autoUpdater.on('update-not-available', () => log('App update not available'))
  autoUpdater.on('update-downloaded', function (e, releaseNotes, releaseName, releaseDate, updateURL) {
    log('App update downloaded: ', releaseName, updateURL)
  })
}
