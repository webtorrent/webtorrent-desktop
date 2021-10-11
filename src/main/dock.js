import electron from '../../electron.cjs'
import * as dialog from './dialog.js'
import log from './log.js'

const { app, Menu } = electron

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
      (process.platform === 'linux' && app.isUnityRunning())) {
    log(`setBadge: ${count}`)
    app.badgeCount = Number(count)
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

export default { downloadFinished, init, setBadge }
