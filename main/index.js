var electron = require('electron')

var app = electron.app

var autoUpdater = require('./auto-updater')
var config = require('../config')
var ipc = require('./ipc')
var menu = require('./menu')
var registerProtocolHandler = require('./register-handlers')
var shortcuts = require('./shortcuts')
var windows = require('./windows')

// Prevent multiple instances of the app from running at the same time. New instances
// signal this instance and exit.
var shouldQuit = app.makeSingleInstance(function (newArgv) {
  newArgv = sliceArgv(newArgv)

  if (app.ipcReady) {
    windows.main.send('log', 'Second app instance attempted to open but was prevented')

    newArgv.forEach(function (torrentId) {
      windows.main.send('dispatch', 'onOpen', torrentId)
    })

    if (windows.main.isMinimized()) {
      windows.main.restore()
    }
    windows.main.focus()
  } else {
    argv.push(...newArgv)
  }
})

if (shouldQuit) {
  app.quit()
}

var argv = sliceArgv(process.argv)

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
  registerProtocolHandler()
})

app.on('ipcReady', function () {
  windows.main.send('log', 'IS_PRODUCTION:', config.IS_PRODUCTION)
  if (argv.length) {
    windows.main.send('log', 'command line args:', process.argv)
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
