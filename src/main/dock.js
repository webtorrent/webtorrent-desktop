module.exports = {
  downloadFinished,
  init,
  setBadge
}

var electron = require('electron')

var app = electron.app

var dialog = require('./dialog')
var log = require('./log')

/**
 * Add a right-click menu to the dock icon. (OS X)
 */
function init () {
  if (!app.dock) return
  var menu = electron.Menu.buildFromTemplate(getMenuTemplate())
  app.dock.setMenu(menu)
}

/**
 * Bounce the Downloads stack if `path` is inside the Downloads folder. (OS X)
 */
function downloadFinished (path) {
  if (!app.dock) return
  log(`downloadFinished: ${path}`)
  app.dock.downloadFinished(path)
}

/**
 * Display string in dock badging area. (OS X)
 */
function setBadge (text) {
  if (!app.dock) return
  log(`setBadge: ${text}`)
  app.dock.setBadge(String(text))
}

function getMenuTemplate () {
  return [
    {
      label: 'Create New Torrent...',
      accelerator: 'CmdOrCtrl+N',
      click: () => dialog.openSeedDirectory()
    },
    {
      label: 'Open Torrent File...',
      accelerator: 'CmdOrCtrl+O',
      click: () => dialog.openTorrentFile()
    },
    {
      label: 'Open Torrent Address...',
      accelerator: 'CmdOrCtrl+U',
      click: () => dialog.openTorrentAddress()
    }
  ]
}
