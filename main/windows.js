var electron = require('electron')
var debug = require('debug')('webtorrent-app:windows')
var config = require('./config')

var app = electron.app

var windows = {
  main: null,
  createMainWindow: createMainWindow
}
var isQuitting = false

app.on('before-quit', function () {
  isQuitting = true
})

function createMainWindow (menu) {
  windows.main = new electron.BrowserWindow({
    backgroundColor: '#282828',
    darkTheme: true,
    minWidth: 375,
    minHeight: 158,
    show: false,
    title: config.APP_NAME,
    titleBarStyle: 'hidden-inset',
    width: 450,
    height: 300
  })
  windows.main.loadURL(config.INDEX)
  windows.main.webContents.on('did-finish-load', function () {
    setTimeout(function () {
      debug('startup time: %sms', Date.now() - app.startTime)
      windows.main.show()
    }, 50)
  })
  windows.main.on('enter-full-screen', menu.onToggleFullScreen)
  windows.main.on('leave-full-screen', menu.onToggleFullScreen)
  windows.main.on('close', function (e) {
    if (process.platform === 'darwin' && !isQuitting) {
      e.preventDefault()
      windows.main.hide()
    }
  })
  windows.main.once('closed', function () {
    windows.main = null
  })
}

module.exports = windows
