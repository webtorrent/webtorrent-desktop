/* eslint-disable import/first */
console.time('init')

import * as RemoteMain from '@electron/remote/main/index.js'
RemoteMain.initialize()
import electron from '../../electron.cjs'
const { app, ipcMain } = electron

// Start crash reporter early, so it takes effect for child processes
import crashReporter from '../crash-reporter.js'
crashReporter.init()

import fs from 'fs'
import parallel from 'run-parallel'
import config from '../config.js'
import ipc from './ipc.js'
import log from './log.js'
import menu from './menu.js'
import State from '../renderer/lib/state.js'
import * as windows from './windows/index.js'

const WEBTORRENT_VERSION = JSON.parse(fs.readFileSync('node_modules/webtorrent/package.json').toString()).version

let shouldQuit = false
let argv = sliceArgv(process.argv)

// allow electron/chromium to play startup sounds (without user interaction)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Start the app without showing the main window when auto launching on login
// (On Windows and Linux, we get a flag. On MacOS, we get special API.)
const hidden = argv.includes('--hidden') ||
  (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAsHidden)

if (config.IS_PRODUCTION) {
  // When Electron is running in production mode (packaged app), then run React
  // in production mode too.
  process.env.NODE_ENV = 'production'
}

if (process.platform === 'win32') {
  const squirrelWin32 = require('./squirrel-win32')
  shouldQuit = squirrelWin32.handleEvent(argv[0])
  argv = argv.filter((arg) => !arg.includes('--squirrel'))
}

if (!shouldQuit && !config.IS_PORTABLE) {
  // Prevent multiple instances of app from running at same time. New instances
  // signal this instance and quit. Note: This feature creates a lock file in
  // %APPDATA%\Roaming\WebTorrent so we do not do it for the Portable App since
  // we want to be "silent" as well as "portable".
  if (!app.requestSingleInstanceLock()) {
    shouldQuit = true
  }
}

if (shouldQuit) {
  app.quit()
} else {
  init().catch(console.error)
}

async function init () {
  console.log('index init')
  app.whenReady().then(() => {
    console.log('readyyyy')
  })
  app.on('second-instance', (event, commandLine, workingDirectory) => onAppOpen(commandLine))
  if (config.IS_PORTABLE) {
    console.log('is portable')
    const path = await import('path')
    // Put all user data into the "Portable Settings" folder
    app.setPath('userData', config.CONFIG_PATH)
    // Put Electron crash files, etc. into the "Portable Settings\Temp" folder
    app.setPath('temp', path.join(config.CONFIG_PATH, 'Temp'))
  }

  let isReady = false // app ready, windows can be created
  app.ipcReady = false // main window has finished loading and IPC is ready
  app.isQuitting = false

  parallel({
    appReady: (cb) => app.whenReady().then(cb),
    state: (cb) => State.load(cb)
  }, onReady)

  function onReady (err, results) {
    if (err) throw err

    isReady = true
    const state = results.state

    menu.init()
    windows.main.init(state, { hidden })
    windows.webtorrent.init()

    // To keep app startup fast, some code is delayed.
    setTimeout(() => {
      delayedInit(state)
    }, config.DELAYED_INIT)

    // Report uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(err)
      const error = { message: err.message, stack: err.stack }
      windows.main.dispatch('uncaughtError', 'main', error)
    })
  }

  // Enable app logging into default directory, i.e. /Library/Logs/WebTorrent
  // on Mac, %APPDATA% on Windows, $XDG_CONFIG_HOME or ~/.config on Linux.
  app.setAppLogsPath()

  app.userAgentFallback = `WebTorrent/${WEBTORRENT_VERSION} (https://webtorrent.io)`

  app.on('open-file', onOpen)
  app.on('open-url', onOpen)

  ipc.init()

  app.once('ipcReady', () => {
    log('Command line args:', argv)
    processArgv(argv)
    console.timeEnd('init')
  })

  app.on('before-quit', e => {
    if (app.isQuitting) return

    app.isQuitting = true
    e.preventDefault()
    windows.main.dispatch('stateSaveImmediate') // try to save state on exit
    ipcMain.once('stateSaved', () => app.quit())
    setTimeout(() => {
      console.error('Saving state took too long. Quitting.')
      app.quit()
    }, 4000) // quit after 4 secs, at most
  })

  app.on('activate', () => {
    console.log('activate')
    if (isReady) windows.main.show()
  })
}

async function delayedInit (state) {
  if (app.isQuitting) return

  const { default: announcement } = await import('./announcement.js')
  const { default: dock } = await import('./dock.js')
  const { default: updater } = await import('./updater.js')
  const { FolderWatcher } = await import('./folder-watcher.js')
  const folderWatcher = new FolderWatcher({ window: windows.main, state })

  announcement.init()
  dock.init()
  updater.init()

  ipc.setModule('folderWatcher', folderWatcher)
  if (folderWatcher.isEnabled()) {
    folderWatcher.start()
  }

  if (process.platform === 'win32') {
    const userTasks = await import('./user-tasks.js')
    userTasks.init()
  }

  if (process.platform !== 'darwin') {
    const { init: trayInit } = await import('./tray.js')
    trayInit()
  }
}

function onOpen (e, torrentId) {
  e.preventDefault()

  if (app.ipcReady) {
    // Magnet links opened from Chrome won't focus the app without a setTimeout.
    // The confirmation dialog Chrome shows causes Chrome to steal back the focus.
    // Electron issue: https://github.com/atom/electron/issues/4338
    setTimeout(() => windows.main.show(), 100)

    processArgv([torrentId])
  } else {
    argv.push(torrentId)
  }
}

function onAppOpen (newArgv) {
  newArgv = sliceArgv(newArgv)

  if (app.ipcReady) {
    log('Second app instance opened, but was prevented:', newArgv)
    windows.main.show()

    processArgv(newArgv)
  } else {
    argv.push(...newArgv)
  }
}

// Remove leading args.
// Production: 1 arg, eg: /Applications/WebTorrent.app/Contents/MacOS/WebTorrent
// Development: 2 args, eg: electron .
// Test: 4 args, eg: electron -r .../mocks.js .
function sliceArgv (argv) {
  return argv.slice(
    config.IS_PRODUCTION
      ? 1
      : config.IS_TEST
        ? 4
        : 2
  )
}

async function processArgv (argv) {
  const torrentIds = []
  await Promise.all(argv.forEach(async arg => {
    if (arg === '-n' || arg === '-o' || arg === '-u') {
      // Critical path: Only load the 'dialog' package if it is needed
      const dialog = await import('./dialog')
      if (arg === '-n') {
        dialog.openSeedDirectory()
      } else if (arg === '-o') {
        dialog.openTorrentFile()
      } else if (arg === '-u') {
        dialog.openTorrentAddress()
      }
    } else if (arg === '--hidden') {
      // Ignore hidden argument, already being handled
    } else if (arg.startsWith('-psn')) {
      // Ignore Mac launchd "process serial number" argument
      // Issue: https://github.com/webtorrent/webtorrent-desktop/issues/214
    } else if (arg.startsWith('--')) {
      // Ignore Spectron flags
    } else if (arg === 'data:,') {
      // Ignore weird Spectron argument
    } else if (arg !== '.') {
      // Ignore '.' argument, which gets misinterpreted as a torrent id, when a
      // development copy of WebTorrent is started while a production version is
      // running.
      torrentIds.push(arg)
    }
  }))
  if (torrentIds.length > 0) {
    windows.main.dispatch('onOpen', torrentIds)
  }
}
