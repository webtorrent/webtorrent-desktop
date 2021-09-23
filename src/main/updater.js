module.exports = {
  init
}

const { autoUpdater } = require('electron')
const get = require('simple-get')

const config = require('../config')
const log = require('./log')
const windows = require('./windows')

const AUTO_UPDATE_URL = config.AUTO_UPDATE_URL +
  '?version=' + config.APP_VERSION +
  '&platform=' + process.platform +
  '&sysarch=' + config.OS_SYSARCH

function init () {
  if (process.platform === 'linux') {
    initLinux()
  } else {
    initDarwinWin32()
  }
}

// The Electron auto-updater does not support Linux yet, so manually check for
// updates and show the user a modal notification.
function initLinux () {
  get.concat(AUTO_UPDATE_URL, onResponse)
}

function onResponse (err, res, data) {
  if (err) return log(`Update error: ${err.message}`)
  if (res.statusCode === 200) {
    // Update available
    try {
      data = JSON.parse(data)
    } catch (err) {
      return log(`Update error: Invalid JSON response: ${err.message}`)
    }
    windows.main.dispatch('updateAvailable', data.version)
  } else if (res.statusCode === 204) {
    // No update available
  } else {
    // Unexpected status code
    log(`Update error: Unexpected status code: ${res.statusCode}`)
  }
}

function initDarwinWin32 () {
  autoUpdater.on(
    'error',
    (err) => log.error(`Update error: ${err.message}`)
  )

  autoUpdater.on(
    'checking-for-update',
    () => log('Checking for update')
  )

  autoUpdater.on(
    'update-available',
    () => log('Update available')
  )

  autoUpdater.on(
    'update-not-available',
    () => log('No update available')
  )

  autoUpdater.on(
    'update-downloaded',
    (e, notes, name, date, url) => log(`Update downloaded: ${name}: ${url}`)
  )

  autoUpdater.setFeedURL({ url: AUTO_UPDATE_URL })
  autoUpdater.checkForUpdates()
}
