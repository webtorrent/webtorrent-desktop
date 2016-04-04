var windows = module.exports = {
  about: null,
  main: null,
  createAboutWindow,
  createWebTorrentHiddenWindow,
  createMainWindow,
  focusWindow
}

var electron = require('electron')

var config = require('../config')
var menu = require('./menu')

function createAboutWindow () {
  if (windows.about) {
    return focusWindow(windows.about)
  }
  var win = windows.about = new electron.BrowserWindow({
    backgroundColor: '#ECECEC',
    show: false,
    center: true,
    resizable: false,
    icon: config.APP_ICON + '.png',
    title: process.platform !== 'darwin'
      ? 'About ' + config.APP_WINDOW_TITLE
      : '',
    useContentSize: true, // Specify web page size without OS chrome
    width: 300,
    height: 170,
    minimizable: false,
    maximizable: false,
    fullscreen: false,
    skipTaskbar: true
  })
  win.loadURL(config.WINDOW_ABOUT)

  // No window menu
  win.setMenu(null)

  win.webContents.on('did-finish-load', function () {
    win.show()
  })

  win.once('closed', function () {
    windows.about = null
  })
}

function createWebTorrentHiddenWindow () {
  var win = windows.webtorrent = new electron.BrowserWindow({
    backgroundColor: '#ECECEC',
    show: false,
    center: true,
    title: 'webtorrent-hidden-window',
    width: 500,
    height: 500,
    minimizable: false,
    maximizable: false,
    fullscreen: false,
    skipTaskbar: true
  })
  win.loadURL(config.WINDOW_WEBTORRENT)

  // To debug the WebTorrent process, set `show` to true above and uncomment:
  // win.webContents.openDevTools({detached: false})
}

function createMainWindow () {
  if (windows.main) {
    return focusWindow(windows.main)
  }
  var win = windows.main = new electron.BrowserWindow({
    backgroundColor: '#282828',
    darkTheme: true, // Forces dark theme (GTK+3)
    icon: config.APP_ICON + '.png',
    minWidth: 375,
    minHeight: 38 + (120 * 2), // header height + 2 torrents
    show: true, // Hide window until DOM finishes loading
    title: config.APP_WINDOW_TITLE,
    titleBarStyle: 'hidden-inset', // Hide OS chrome, except traffic light buttons (OS X)
    useContentSize: true, // Specify web page size without OS chrome
    width: 500,
    height: 38 + (120 * 5) // header height + 4 torrents
  })
  win.loadURL(config.WINDOW_MAIN)

  win.webContents.on('dom-ready', function () {
    menu.onToggleFullScreen()
  })

  win.on('blur', menu.onWindowHide)
  win.on('focus', menu.onWindowShow)

  win.on('enter-full-screen', () => menu.onToggleFullScreen(true))
  win.on('leave-full-screen', () => menu.onToggleFullScreen(false))

  win.on('close', function (e) {
    if (!electron.app.isQuitting) {
      e.preventDefault()
      win.send('dispatch', 'pause')
      win.hide()
    }
  })

  win.once('closed', function () {
    windows.main = null
  })
}

function focusWindow (win) {
  if (win.isMinimized()) {
    win.restore()
  }
  win.show() // shows and gives focus
}
