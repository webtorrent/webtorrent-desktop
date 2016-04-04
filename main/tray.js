module.exports = {
  init
}

var path = require('path')
var electron = require('electron')

var app = electron.app
var Menu = electron.Menu
var Tray = electron.Tray

var windows = require('./windows')

var trayIcon

function init () {
  // OS X has no tray icon
  if (process.platform === 'darwin') return

  trayIcon = new Tray(path.join(__dirname, '..', 'static', 'WebTorrentSmall.png'))

  // On Windows, left click to open the app, right click for context menu
  // On Linux, any click (right or left) opens the context menu
  trayIcon.on('click', showApp)

  // Show the tray context menu, and keep the available commands up to date
  updateTrayMenu()
  windows.main.on('show', updateTrayMenu)
  windows.main.on('hide', updateTrayMenu)
}

function updateTrayMenu () {
  var showHideMenuItem
  if (windows.main.isVisible()) {
    showHideMenuItem = { label: 'Hide to tray', click: hideApp }
  } else {
    showHideMenuItem = { label: 'Show', click: showApp }
  }
  var contextMenu = Menu.buildFromTemplate([
    showHideMenuItem,
    { label: 'Quit', click: () => app.quit() }
  ])
  trayIcon.setContextMenu(contextMenu)
}

function showApp () {
  windows.main.show()
}

function hideApp () {
  windows.main.hide()
}
