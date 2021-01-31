module.exports = {
  openExternal,
  openPath,
  showItemInFolder,
  moveItemToTrash
}

const { shell } = require('electron')
const log = require('./log')

/**
 * Open the given external protocol URL in the desktop’s default manner.
 */
function openExternal (url) {
  log(`openExternal: ${url}`)
  shell.openExternal(url)
}

/**
 * Open the given file in the desktop’s default manner.
 */

function openPath (path) {
  log(`openPath: ${path}`)
  shell.openPath(path)
}

/**
 * Show the given file in a file manager. If possible, select the file.
 */
function showItemInFolder (path) {
  log(`showItemInFolder: ${path}`)
  shell.showItemInFolder(path)
}

/**
 * Move the given file to trash and returns a boolean status for the operation.
 */
function moveItemToTrash (path) {
  log(`moveItemToTrash: ${path}`)
  shell.moveItemToTrash(path)
}
