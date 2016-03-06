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
  var win = windows.main = new electron.BrowserWindow({
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
  win.loadURL(config.INDEX)

  win.webContents.on('dom-ready', function () {
    menu.onToggleFullScreen()
  })

  win.webContents.on('did-finish-load', function () {
    setTimeout(function () {
      debug('startup time: %sms', Date.now() - app.startTime)
      win.show()
    }, 50)
  })

  win.on('blur', menu.onWindowHide)
  win.on('focus', menu.onWindowShow)

  win.on('enter-full-screen', menu.onToggleFullScreen)
  win.on('leave-full-screen', menu.onToggleFullScreen)

  win.on('close', function (e) {
    if (process.platform === 'darwin' && !isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })
  win.once('closed', function () {
    win = null
  })
}

module.exports = windows
