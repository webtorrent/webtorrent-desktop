import electron from '../../electron.cjs'
import * as windows from './windows/index.js'

const { app } = electron

/**
 * In the main electron process, we do not use console.log() statements because they do
 * not show up in a convenient location when running the packaged (i.e. production)
 * version of the app. Instead use this module, which sends the logs to the main window
 * where they can be viewed in Developer Tools.
 */
export default function log (...args) {
  if (app.ipcReady) {
    windows.main.send('log', ...args)
  } else {
    app.once('ipcReady', () => windows.main.send('log', ...args))
  }
}

export function error (...args) {
  if (app.ipcReady) {
    windows.main.send('error', ...args)
  } else {
    app.once('ipcReady', () => windows.main.send('error', ...args))
  }
}
