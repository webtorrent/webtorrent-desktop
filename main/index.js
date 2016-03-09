var startTime = Date.now()

var electron = require('electron')
var ipc = require('./ipc')
var menu = require('./menu')
var shortcuts = require('./shortcuts')
var windows = require('./windows')

var app = electron.app

app.isQuitting = false
app.startTime = startTime

app.on('ready', function () {
  menu.init()
  windows.createMainWindow()
  shortcuts.init()
})

app.on('open-file', onOpen)
app.on('open-url', onOpen)

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
  windows.main.send('dispatch', 'addTorrent', torrentId)
}
