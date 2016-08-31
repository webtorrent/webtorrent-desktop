module.exports = {
  downloadFinished,
  init,
  setBadge
}

const {app, Menu} = require('electron')

const dialog = require('./dialog')
const log = require('./log')

/**
 * Add a right-click menu to the dock icon. (Mac)
 */
function init () {
  if (!app.dock) return
  const menu = Menu.buildFromTemplate(getMenuTemplate())
  app.dock.setMenu(menu)
}

/**
 * Bounce the Downloads stack if `path` is inside the Downloads folder. (Mac)
 */
function downloadFinished (path) {
  if (!app.dock) return
  log(`downloadFinished: ${path}`)
  app.dock.downloadFinished(path)
}

/**
 * Display a counter badge for the app. (Mac, Linux)
 */
function setBadge (count) {
  if (process.platform === 'darwin' ||
      process.platform === 'linux' && app.isUnityRunning()) {
    log(`setBadge: ${count}`)
    app.setBadgeCount(Number(count))
  }
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
