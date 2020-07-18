module.exports = {
  openExternal,
  openPath,
  showItemInFolder,
  moveItemToTrash
}

const electron = require('electron')
const log = require('./log')

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
function openPath (path) {
  log(`openPath: ${path}`)
  electron.shell.openPath(path)
}

/**
 * Show the given file in a file manager. If possible, select the file.
 */
function showItemInFolder (path) {
  log(`showItemInFolder: ${path}`)
  electron.shell.showItemInFolder(path)
}

/**
 * Move the given file to trash and returns a boolean status for the operation.
 */
function moveItemToTrash (path) {
  log(`moveItemToTrash: ${path}`)
  electron.shell.moveItemToTrash(path)
}
