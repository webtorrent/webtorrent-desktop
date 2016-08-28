module.exports = {
  downloadFinished,
  init,
  setBadge
}

var electron = require('electron')
var IntlMessageFormat = require('intl-messageformat')

var app = electron.app

var dialog = require('./dialog')
var log = require('./log')

/**
 * Add a right-click menu to the dock icon. (Mac)
 */
function init () {
  if (!app.dock) return
  var menu = electron.Menu.buildFromTemplate(getMenuTemplate())
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
  log(`setBadge: ${count}`)
  app.setBadgeCount(Number(count))
}

function getMenuTemplate () {
  // Defer i18n loading to access electron locale
  var i18n = require('../i18n')

  return [
    {
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['create-torrent'] || 'Create New Torrent...', i18n.LANGUAGE).format(),
      accelerator: 'CmdOrCtrl+N',
      click: () => dialog.openSeedDirectory()
    },
    {
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-open-torrent-file'] || 'Open Torrent File...', i18n.LANGUAGE).format(),
      accelerator: 'CmdOrCtrl+O',
      click: () => dialog.openTorrentFile()
    },
    {
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-open-torrent-address'] || 'Open Torrent Address...', i18n.LANGUAGE).format(),
      accelerator: 'CmdOrCtrl+U',
      click: () => dialog.openTorrentAddress()
    }
  ]
}
