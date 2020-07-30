module.exports = {
  handleEvent
}

const path = require('path')
const spawn = require('child_process').spawn
const electron = require('electron')

const app = electron.app

const handlers = require('./handlers')

const EXE_NAME = path.basename(process.execPath)
const UPDATE_EXE = path.join(process.execPath, '..', '..', 'Update.exe')

const run = function (args, done) {
  spawn(UPDATE_EXE, args, { detached: true })
    .on('close', done)
}

function handleEvent (cmd) {
  if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
    run([`--createShortcut=${EXE_NAME}`], app.quit)
    return true
  }

  if (cmd === '--squirrel-uninstall') {
    // Uninstall .torrent file and magnet link handlers
    handlers.uninstall()

    run([`--removeShortcut=${EXE_NAME}`], app.quit)
    return true
  }

  if (cmd === '--squirrel-obsolete') {
    app.quit()
    return true
  }

  return false
}
