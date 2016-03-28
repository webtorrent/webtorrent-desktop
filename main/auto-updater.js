module.exports = {
  init
}

var electron = require('electron')
var get = require('simple-get')

var config = require('../config')
var log = require('./log')
var windows = require('./windows')

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
  setTimeout(checkForUpdates, config.AUTO_UPDATE_CHECK_STARTUP_DELAY)

  autoUpdater.on('checking-for-update', () => log('Checking for app update'))
  autoUpdater.on('update-available', () => log('App update available'))
  autoUpdater.on('update-not-available', () => log('App update not available'))
  autoUpdater.on('update-downloaded', function (e, releaseNotes, releaseName, releaseDate, updateURL) {
    log('App update downloaded: ', releaseName, updateURL)
  })
}

function checkForUpdates () {
  // Electron's built-in auto updater only supports Mac and Windows, for now
  if (process.platform !== 'linux') {
    return autoUpdater.checkForUpdates()
  }

  // If we're on Linux, we have to do it ourselves
  get.concat(config.AUTO_UPDATE_URL, function (err, res, data) {
    if (err) return log('Error checking for app update: ' + err.message)
    if (![200, 204].includes(res.statusCode)) return log('Error checking for app update, got HTTP ' + res.statusCode)
    if (res.statusCode !== 200) return

    var obj = JSON.parse(data)
    // TODO: version should be included in the response object, we shouldn'v have to parse obj.name
    var version = obj.name.slice(obj.name.lastIndexOf('v') + 1)
    windows.main.send('dispatch', 'updateAvailable', version)
  })
}
