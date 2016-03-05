var startTime = Date.now()

var electron = require('electron')
var ipc = require('./ipc')
var menu = require('./menu')
var windows = require('./windows')

var app = electron.app

app.startTime = startTime

app.on('open-file', onOpen)
app.on('open-url', onOpen)

app.on('ready', function () {
  electron.Menu.setApplicationMenu(menu.appMenu)
  windows.createMainWindow(menu)
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
  windows.main.send('addTorrent', torrentId)
}
