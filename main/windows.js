var windows = module.exports = {
  main: null,
  createMainWindow: createMainWindow
}

var electron = require('electron')

var app = electron.app
var ipcMain = electron.ipcMain

var config = require('../config')
var menu = require('./menu')

function createMainWindow () {
  var win = windows.main = new electron.BrowserWindow({
    autoHideMenuBar: true, // Hide top menu bar unless Alt key is pressed (Windows, Linux)
    backgroundColor: '#282828',
    darkTheme: true, // Forces dark theme (GTK+3)
    icon: config.APP_ICON,
    minWidth: 375,
    minHeight: 38 + (120 * 2), // header height + 2 torrents
    show: false, // Hide window until DOM finishes loading
    title: config.APP_NAME,
    titleBarStyle: 'hidden-inset', // Hide OS chrome, except traffic light buttons (OS X)
    width: 450,
    height: 38 + (120 * 4) // header height + 4 torrents
  })
  win.loadURL(config.INDEX)

  win.webContents.on('dom-ready', function () {
    menu.onToggleFullScreen()
  })

  win.webContents.on('did-finish-load', function () {
    win.show()
  })

  win.on('blur', menu.onWindowHide)
  win.on('focus', menu.onWindowShow)

  win.on('enter-full-screen', () => menu.onToggleFullScreen(true))
  win.on('leave-full-screen', () => menu.onToggleFullScreen(false))

  win.on('close', function (e) {
    if (process.platform === 'darwin' && !app.isQuitting) {
      e.preventDefault()
      // When the window is hidden, the update() loop (which uses
      // requestAnimationFrame) ceases to run. We need to make sure
      // the video pauses before hiding or it will continue to play.

      win.send('dispatch', 'pause')
      ipcMain.once('paused-video', function (e) {
        win.hide()
      })
    }
  })

  win.once('closed', function () {
    windows.main = null
  })
}
