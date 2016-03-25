var electron = require('electron')

var app = electron.app

var autoUpdater = require('./auto-updater')
var config = require('../config')
var handlers = require('./handlers')
var ipc = require('./ipc')
var log = require('./log')
var menu = require('./menu')
var shortcuts = require('./shortcuts')
var squirrelWin32 = require('./squirrel-win32')
var windows = require('./windows')

var shouldQuit = false
var argv = sliceArgv(process.argv)

if (process.platform === 'win32') {
  shouldQuit = squirrelWin32.handleEvent(argv[0])
  argv.shift() // Remove any --squirrel-xxxx arguments
  // app.setAppUserModelId('com.squirrel.WebTorrent.WebTorrent')
}

if (!shouldQuit) {
  // Prevent multiple instances of app from running at same time. New instances signal
  // this instance and quit.
  shouldQuit = app.makeSingleInstance(onAppOpen)
  if (shouldQuit) {
    app.quit()
  }
}

if (!shouldQuit) {
  init()
}

function init () {
  app.ipcReady = false // main window has finished loading and IPC is ready
  app.isQuitting = false

  // Open handlers must be added as early as possible
  app.on('open-file', onOpen)
  app.on('open-url', onOpen)

  ipc.init()

  app.on('will-finish-launching', function () {
    autoUpdater.init()
    setupCrashReporter()
  })

  app.on('ready', function () {
    menu.init()
    windows.createMainWindow()
    shortcuts.init()
    if (process.platform !== 'win32') handlers.init()
  })

  app.on('ipcReady', function () {
    log('Command line args:', argv)
    argv.forEach(function (torrentId) {
      windows.main.send('dispatch', 'onOpen', torrentId)
    })
  })

  app.on('before-quit', function () {
    app.isQuitting = true
  })

  app.on('activate', function () {
    if (windows.main) {
      windows.main.show()
    } else {
      windows.createMainWindow()
    }
  })

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

function onOpen (e, torrentId) {
  e.preventDefault()

  if (app.ipcReady) {
    windows.main.send('dispatch', 'onOpen', torrentId)
    // Magnet links opened from Chrome won't focus the app without a setTimeout. The
    // confirmation dialog Chrome shows causes Chrome to steal back the focus.
    // Electron issue: https://github.com/atom/electron/issues/4338
    setTimeout(function () {
      windows.focusMainWindow()
    }, 100)
  } else {
    argv.push(torrentId)
  }
}

function onAppOpen (newArgv) {
  newArgv = sliceArgv(newArgv)

  if (app.ipcReady) {
    log('Second app instance opened, but was prevented:', newArgv)
    windows.focusMainWindow()

    newArgv.forEach(function (torrentId) {
      windows.main.send('dispatch', 'onOpen', torrentId)
    })
  } else {
    argv.push(...newArgv)
  }
}

function sliceArgv (argv) {
  return argv.slice(config.IS_PRODUCTION ? 1 : 2)
}

function setupCrashReporter () {
  // require('crash-reporter').start({
  //   productName: 'WebTorrent',
  //   companyName: 'WebTorrent',
  //   submitURL: 'https://webtorrent.io/crash-report',
  //   autoSubmit: true
  // })
}
