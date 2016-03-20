var electron = require('electron')
var ipc = require('./ipc')
var menu = require('./menu')
var shortcuts = require('./shortcuts')
var windows = require('./windows')

var app = electron.app

app.on('open-file', onOpen)
app.on('open-url', onOpen)

app.ipcReady = false // main window has finished loading and IPC is ready
app.isQuitting = false

app.on('ready', function () {
  menu.init()
  windows.createMainWindow()
  shortcuts.init()
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
    onReadyOpen()
  } else {
    app.on('ipcReady', onReadyOpen)
  }
  function onReadyOpen () {
    windows.main.send('dispatch', 'onOpen', torrentId)
    windows.main.focus()
  }
}
