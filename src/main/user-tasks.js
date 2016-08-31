module.exports = {
  init
}

const electron = require('electron')

const app = electron.app

/**
 * Add a user task menu to the app icon on right-click. (Windows)
 */
function init () {
  if (process.platform !== 'win32') return
  app.setUserTasks(getUserTasks())
}

function getUserTasks () {
  return [
    {
      arguments: '-n',
      title: 'Create New Torrent...',
      description: 'Create a new torrent'
    },
    {
      arguments: '-o',
      title: 'Open Torrent File...',
      description: 'Open a .torrent file'
    },
    {
      arguments: '-u',
      title: 'Open Torrent Address...',
      description: 'Open a torrent from a URL'
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
