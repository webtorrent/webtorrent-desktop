var electron = require('electron')

var app = electron.app

var config = require('../config')
var ipc = require('./ipc')
var menu = require('./menu')
var registerProtocolHandler = require('./register-handlers')
var shortcuts = require('./shortcuts')
var windows = require('./windows')

var argv = process.argv.slice(config.IS_PRODUCTION ? 1 : 2)

app.on('open-file', onOpen)
app.on('open-url', onOpen)

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
