module.exports = {
  openExternal,
  openItem,
  showItemInFolder
}

var electron = require('electron')
var log = require('./log')

/**
 * Open the given external protocol URL in the desktop’s default manner.
 */
function openExternal (url) {
  log(`openExternal: ${url}`)
  electron.shell.openExternal(url)
}

/**
 * Open the given file in the desktop’s default manner.
 */
function openItem (path) {
  log(`openItem: ${path}`)
  electron.shell.openItem(path)
}

/**
 * Show the given file in a file manager. If possible, select the file.
 */
function showItemInFolder (path) {
  log(`showItemInFolder: ${path}`)
  electron.shell.showItemInFolder(path)
}
