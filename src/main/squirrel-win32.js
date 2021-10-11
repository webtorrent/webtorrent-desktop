import { app } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import handlers from './handlers.js'

const EXE_NAME = path.basename(process.execPath)
const UPDATE_EXE = path.join(process.execPath, '..', '..', 'Update.exe')

const run = (args, done) => {
  spawn(UPDATE_EXE, args, { detached: true }).on('close', done)
}

export function handleEvent (cmd) {
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
