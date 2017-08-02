module.exports = {
  hasTray,
  init,
  setWindowFocus
}

const electron = require('electron')

const app = electron.app

const config = require('../config')
const windows = require('./windows')

let tray

function init () {
  if (process.platform === 'linux') {
    initLinux()
  }
  if (process.platform === 'win32') {
    initWin32()
  }
  // Mac apps generally do not have menu bar icons
}

/**
 * Returns true if there a tray icon is active.
 */
function hasTray () {
  return !!tray
}

function setWindowFocus (flag) {
  if (!tray) return
  updateTrayMenu()
}

function initLinux () {
  checkLinuxTraySupport(function (err) {
    if (!err) createTray()
  })
}

function initWin32 () {
  createTray()
}

/**
 * Check for libappindicator1 support before creating tray icon
 */
function checkLinuxTraySupport (cb) {
  const fs = require('fs')

  // Check that we have libappindicator1 if we are running debian
  // If WebTorrent was installed from the deb file, we should always have it
  // If it was installed from the zip file, we might not

  // if /etc/debian_version exists, the distro is debian based
  fs.stat('/etc/debian_version', function (err) {
    // the distro is debian based
    if (err == null) {
      const cp = require('child_process')
      cp.exec('dpkg --get-selections libappindicator1', function (err, stdout) {
        if (err) return cb(err)
        // Unfortunately there's no cleaner way, as far as I can tell, to check
        // whether a debian package is installed:
        if (stdout.endsWith('\tinstall\n')) {
          cb()
        } else {
          cb(new Error('debian package not installed'))
        }
      })
    // the distro isn't debian based
    } else if (err.code === 'ENOENT') {
      cb()
    // error checking file
    } else {
      cb(err)
    }
  })
}

function createTray () {
  tray = new electron.Tray(getIconPath())

  // On Windows, left click opens the app, right click opens the context menu.
  // On Linux, any click (left or right) opens the context menu.
  tray.on('click', () => windows.main.show())

  // Show the tray context menu, and keep the available commands up to date
  updateTrayMenu()
}

function updateTrayMenu () {
  const contextMenu = electron.Menu.buildFromTemplate(getMenuTemplate())
  tray.setContextMenu(contextMenu)
}

function getMenuTemplate () {
  return [
    getToggleItem(),
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]

  function getToggleItem () {
    if (windows.main.win.isVisible()) {
      return {
        label: 'Hide to tray',
        click: () => windows.main.hide()
      }
    } else {
      return {
        label: 'Show WebTorrent',
        click: () => windows.main.show()
      }
    }
  }
}

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}
