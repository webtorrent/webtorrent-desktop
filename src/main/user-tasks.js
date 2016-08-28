module.exports = {
  init
}

var electron = require('electron')
var IntlMessageFormat = require('intl-messageformat')

var app = electron.app

/**
 * Add a user task menu to the app icon on right-click. (Windows)
 */
function init () {
  if (process.platform !== 'win32') return
  app.setUserTasks(getUserTasks())
}

function getUserTasks () {
  // Defer i18n loading to access electron locale
  var i18n = require('../i18n')

  return [
    {
      arguments: '-n',
      title: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-create-torrent'] || 'Create New Torrent...', i18n.LANGUAGE).format(),
      description: new IntlMessageFormat(
          i18n.LOCALE_MESSAGES['menu-create-torrent-desc'] || 'Create a new torrent', i18n.LANGUAGE).format()
    },
    {
      arguments: '-o',
      title: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-open-torrent-file'] || 'Open Torrent File...', i18n.LANGUAGE).format(),
      description: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-open-torrent-file-desc'] || 'Open a .torrent file', i18n.LANGUAGE).format()
    },
    {
      arguments: '-u',
      title: new IntlMessageFormat(
          i18n.LOCALE_MESSAGES['menu-open-torrent-address'] || 'Open Torrent Address...', i18n.LANGUAGE).format(),
      description: new IntlMessageFormat(
          i18n.LOCALE_MESSAGES['menu-open-torrent-address-desc'] || 'Open a torrent from a URL', i18n.LANGUAGE).format()
    }
  ].map(getUserTasksItem)
}

function getUserTasksItem (item) {
  return Object.assign(item, {
    program: process.execPath,
    iconPath: process.execPath,
    iconIndex: 0
  })
}
