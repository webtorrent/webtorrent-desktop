module.exports = {
  init
}

var electron = require('electron')
var get = require('simple-get')

var config = require('../config')
var log = require('./log')
var windows = require('./windows')

var AUTO_UPDATE_URL = config.AUTO_UPDATE_URL +
  '?version=' + config.APP_VERSION +
  '&platform=' + process.platform

function init () {
  if (process.platform === 'linux') {
    initLinux()
  } else {
    initDarwinWin32()
  }
}

// The Electron auto-updater does not support Linux yet, so manually check for updates and
// `show the user a modal notification.
function initLinux () {
  get.concat(AUTO_UPDATE_URL, onResponse)

  function onResponse (err, res, data) {
    if (err) return log(`Update error: ${err.message}`)
    if (res.statusCode === 200) {
      // Update available
      try {
        data = JSON.parse(data)
      } catch (err) {
        return log(`Update error: Invalid JSON response: ${err.message}`)
      }
      windows.main.send('dispatch', 'updateAvailable', data.version)
    } else if (res.statusCode === 204) {
      // No update available
    } else {
      // Unexpected status code
      log(`Update error: Unexpected status code: ${res.statusCode}`)
    }
  }
}

function initDarwinWin32 () {
  electron.autoUpdater.on(
    'error',
    (err) => log.error(`Update error: ${err.message}`)
  )

  electron.autoUpdater.on(
    'checking-for-update',
    () => log('Checking for update')
  )

  electron.autoUpdater.on(
    'update-available',
    () => log('Update available')
  )

  electron.autoUpdater.on(
    'update-not-available',
    () => log('Update not available')
  )

  electron.autoUpdater.on(
    'update-downloaded',
    (e, notes, name, date, url) => log(`Update downloaded: ${name}: ${url}`)
  )

  electron.autoUpdater.setFeedURL(AUTO_UPDATE_URL)
  electron.autoUpdater.checkForUpdates()
}
