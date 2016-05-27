module.exports = {
  hasTray,
  init,
  onWindowHide,
  onWindowShow
}

var electron = require('electron')

var app = electron.app

var config = require('../config')
var windows = require('./windows')

var tray

function init () {
  if (process.platform === 'linux') {
    initLinux()
  }
  if (process.platform === 'win32') {
    initWin32()
  }
  // OS X apps generally do not have menu bar icons
}

function initLinux () {
  // Check for libappindicator1 support before creating tray icon
  checkLinuxTraySupport(function (supportsTray) {
    if (supportsTray) createTray()
  })
}

function initWin32 () {
  createTray()
}

function checkLinuxTraySupport (cb) {
  var cp = require('child_process')

  // Check that we're on Ubuntu (or another debian system) and that we have
  // libappindicator1. If WebTorrent was installed from the deb file, we should
  // always have it. If it was installed from the zip file, we might not.
  cp.exec('dpkg --get-selections libappindicator1', function (err, stdout) {
    if (err) return cb(false)
    // Unfortunately there's no cleaner way, as far as I can tell, to check
    // whether a debian package is installed:
    cb(stdout.endsWith('\tinstall\n'))
  })
}

function hasTray () {
  return !!tray
}

function createTray () {
  tray = new electron.Tray(getIconPath())

  // On Windows, left click opens the app, right click opens the context menu.
  // On Linux, any click (left or right) opens the context menu.
  tray.on('click', showApp)

  // Show the tray context menu, and keep the available commands up to date
  updateTrayMenu()
}

function onWindowHide () {
  updateTrayMenu()
}

function onWindowShow () {
  updateTrayMenu()
}

function updateTrayMenu () {
  if (!tray) return

  var contextMenu = electron.Menu.buildFromTemplate([
    getToggleItem(),
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])
  tray.setContextMenu(contextMenu)

  function getToggleItem () {
    if (windows.main.win.isVisible()) {
      return {
        label: 'Hide to tray',
        click: hideApp
      }
    } else {
      return {
        label: 'Show WebTorrent',
        click: showApp
      }
    }
  }
}

function showApp () {
  windows.main.show()
}

function hideApp () {
  windows.main.hide()
  windows.main.send('dispatch', 'backToList')
}

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}
