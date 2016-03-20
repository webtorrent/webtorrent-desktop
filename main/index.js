var electron = require('electron')

var app = electron.app

var ipc = require('./ipc')
var menu = require('./menu')
var shortcuts = require('./shortcuts')
var windows = require('./windows')
var registerProtocolHandler = require('./register-protocol-handler')

var argv = process.argv.slice(2)

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
  if (argv.length) {
    windows.main.send('log', 'command line args:', argv)
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
