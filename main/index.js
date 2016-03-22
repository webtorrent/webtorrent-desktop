var electron = require('electron')

var app = electron.app

var autoUpdater = require('./auto-updater')
var config = require('../config')
var handlers = require('./handlers')
var ipc = require('./ipc')
var log = require('./log')
var menu = require('./menu')
var shortcuts = require('./shortcuts')
var windows = require('./windows')

var argv = sliceArgv(process.argv)

if (process.platform === 'win32') {
  var squirrelCmd = argv[0]
  if (squirrelCmd === '--squirrel-install' || squirrelCmd === '--squirrel-updated') {
    handlers.init()

    // TODO:
    // - Install desktop and start menu shortcuts
    // - Add explorer context menus

    // Always quit when done
    app.quit()
  }
  if (squirrelCmd === '--squirrel-uninstall') {
    // Undo anything we did in the --squirrel-install and --squirrel-updated handlers

    // TODO: implement this

    // Always quit when done
    app.quit()
  }
  if (squirrelCmd === '--squirrel-obsolete') {
    // This is called on the outgoing version of your app before we update to the new
    // version - it's the opposite of --squirrel-updated

    // Always quit when done
    app.quit()
  }
}

// Prevent multiple instances of the app from running at the same time. New instances
// signal this instance and exit.
var shouldQuit = app.makeSingleInstance(function (newArgv) {
  newArgv = sliceArgv(newArgv)

  if (app.ipcReady) {
    log('Second app instance attempted to open but was prevented')
    windows.focusMainWindow()

    newArgv.forEach(function (torrentId) {
      windows.main.send('dispatch', 'onOpen', torrentId)
    })
  } else {
    argv.push(...newArgv)
  }
})

if (shouldQuit) {
  app.quit()
}

app.on('open-file', onOpen)
app.on('open-url', onOpen)
app.on('will-finish-launching', function () {
  autoUpdater.init()
  setupCrashReporter()
})

app.ipcReady = false // main window has finished loading and IPC is ready
app.isQuitting = false

app.on('ready', function () {
  menu.init()
  windows.createMainWindow()
  shortcuts.init()
  if (process.platform !== 'win32') handlers.init()
})

app.on('ipcReady', function () {
  log('IS_PRODUCTION:', config.IS_PRODUCTION)
  if (argv.length) {
    log('command line args:', process.argv)
  }
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
    windows.createMainWindow(menu)
  }
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipc.init()

function onOpen (e, torrentId) {
  e.preventDefault()
  if (app.ipcReady) {
    windows.main.send('dispatch', 'onOpen', torrentId)
    setTimeout(function () {
      // Required for magnet links opened from Chrome otherwise the confirmation dialog
      // that Chrome shows causes Chrome to steal back the focus.
      // Electron issue: https://github.com/atom/electron/issues/4338
      windows.focusMainWindow()
    }, 100)
  } else {
    argv.push(torrentId)
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
