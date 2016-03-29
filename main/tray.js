module.exports = {
  init
}

var path = require('path')
var electron = require('electron')
var windows = require('./windows')

function init () {
  // No tray icon on OSX
  if (process.platform === 'darwin') return

  var trayIcon = new electron.Tray(path.join(__dirname, '..', 'static', 'WebTorrentSmall.png'))

  // On Windows, left click to open the app, right click for context menu
  // On Linux, any click (right or left) opens the context menu
  trayIcon.on('click', showApp)
  var contextMenu = electron.Menu.buildFromTemplate([
    { label: 'Show', click: showApp },
    { label: 'Quit', click: quitApp }
  ])
  trayIcon.setContextMenu(contextMenu)
}

function showApp () {
  windows.main.show()
}

function quitApp () {
  electron.app.quit()
}
