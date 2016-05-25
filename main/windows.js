var windows = module.exports = {
  about: null,
  main: null,
  createAboutWindow,
  createWebTorrentHiddenWindow,
  createMainWindow,
  focusWindow
}

var electron = require('electron')

var app = electron.app

var config = require('../config')
var menu = require('./menu')
var tray = require('./tray')

function createAboutWindow () {
  if (windows.about) {
    return focusWindow(windows.about)
  }
  var win = windows.about = new electron.BrowserWindow({
    backgroundColor: '#ECECEC',
    show: false,
    center: true,
    resizable: false,
    icon: getIconPath(),
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
    backgroundColor: '#1E1E1E',
    show: false,
    center: true,
    title: 'webtorrent-hidden-window',
    useContentSize: true,
    width: 150,
    height: 150,
    minimizable: false,
    maximizable: false,
    resizable: false,
    fullscreenable: false,
    fullscreen: false,
    skipTaskbar: true
  })
  win.loadURL(config.WINDOW_WEBTORRENT)

  // Prevent killing the WebTorrent process
  win.on('close', function (e) {
    if (!app.isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  win.once('closed', function () {
    windows.webtorrent = null
  })
}

var HEADER_HEIGHT = 37
var TORRENT_HEIGHT = 100

function createMainWindow () {
  if (windows.main) {
    return focusWindow(windows.main)
  }
  var win = windows.main = new electron.BrowserWindow({
    backgroundColor: '#1E1E1E',
    darkTheme: true, // Forces dark theme (GTK+3)
    icon: getIconPath(), // Window icon (Windows, Linux)
    minWidth: config.WINDOW_MIN_WIDTH,
    minHeight: config.WINDOW_MIN_HEIGHT,
    show: false, // Hide window until renderer sends 'ipcReady' event
    title: config.APP_WINDOW_TITLE,
    titleBarStyle: 'hidden-inset', // Hide OS chrome, except traffic light buttons (OS X)
    useContentSize: true, // Specify web page size without OS chrome
    width: 500,
    height: HEADER_HEIGHT + (TORRENT_HEIGHT * 6) // header height + 5 torrents
  })
  win.loadURL(config.WINDOW_MAIN)
  if (process.platform === 'darwin') {
    win.setSheetOffset(HEADER_HEIGHT)
  }

  win.webContents.on('dom-ready', function () {
    menu.onToggleFullScreen()
  })

  win.on('blur', menu.onWindowHide)
  win.on('focus', menu.onWindowShow)

  win.on('enter-full-screen', () => menu.onToggleFullScreen(true))
  win.on('leave-full-screen', () => menu.onToggleFullScreen(false))

  win.on('close', function (e) {
    if (process.platform !== 'darwin' && !tray.hasTray()) {
      app.quit()
    } else if (!app.isQuitting) {
      e.preventDefault()
      win.hide()
      win.send('dispatch', 'backToList')
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

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}
