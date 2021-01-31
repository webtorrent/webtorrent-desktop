module.exports = {
  hasTray,
  init,
  setWindowFocus
}

const { app, Tray, Menu } = require('electron')

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
 * Check for libappindicator support before creating tray icon.
 */
function checkLinuxTraySupport (cb) {
  const cp = require('child_process')

  // Check that libappindicator libraries are installed in system.
  cp.exec('ls /usr/lib*/libappindicator*', function (err, stdout) {
    if (err) return cb(err)
    cb(null)
  })
}

function createTray () {
  tray = new Tray(getIconPath())

  // On Windows, left click opens the app, right click opens the context menu.
  // On Linux, any click (left or right) opens the context menu.
  tray.on('click', () => windows.main.show())

  // Show the tray context menu, and keep the available commands up to date
  updateTrayMenu()
}

function updateTrayMenu () {
  const contextMenu = Menu.buildFromTemplate(getMenuTemplate())
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
