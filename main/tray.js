module.exports = {
  init
}

var path = require('path')
var electron = require('electron')
var windows = require('./windows')

var trayIcon

function init () {
  // No tray icon on OSX
  if (process.platform === 'darwin') {
    // Instead of relying on the tray icon quit button, listen for Cmd+Q
    electron.app.once('before-quit', quitApp)
  }

  trayIcon = new electron.Tray(path.join(__dirname, '..', 'static', 'WebTorrentSmall.png'))

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
  var contextMenu = electron.Menu.buildFromTemplate([
    showHideMenuItem,
    { label: 'Quit', click: quitApp }
  ])
  trayIcon.setContextMenu(contextMenu)
}

function showApp () {
  windows.main.show()
}

function hideApp () {
  windows.main.hide()
}

function quitApp (e) {
  e.preventDefault()
  windows.main.send('dispatch', 'saveState') /* try to save state on exit */
  electron.ipcMain.once('savedState', () => electron.app.quit())
  setTimeout(() => electron.app.quit(), 2000) /* exit after at most 2 secs */
}
