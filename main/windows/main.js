var main = module.exports = {
  create,
  focus,
  hide,
  send,
  show,
  toggleFullScreen,
  win: null
}

var electron = require('electron')

var app = electron.app

var config = require('../../config')
var log = require('../log')
var menu = require('../menu')
var tray = require('../tray')
var util = require('./util')

var HEADER_HEIGHT = 37
var TORRENT_HEIGHT = 100

function create () {
  if (main.win) {
    return util.focusWindow(main.win)
  }
  var win = main.win = new electron.BrowserWindow({
    backgroundColor: '#1E1E1E',
    darkTheme: true, // Forces dark theme (GTK+3)
    icon: getIconPath(), // Window icon (Windows, Linux)
    minWidth: config.WINDOW_MIN_WIDTH,
    minHeight: config.WINDOW_MIN_HEIGHT,
    show: false, // Hide window until renderer sends 'ipcReady'
    title: config.APP_WINDOW_TITLE,
    titleBarStyle: 'hidden-inset', // Hide title bar (OS X)
    useContentSize: true, // Specify web page size without OS chrome
    width: 500,
    height: HEADER_HEIGHT + (TORRENT_HEIGHT * 6) // header height + 5 torrents
  })

  win.loadURL(config.WINDOW_MAIN)

  if (win.setSheetOffset) win.setSheetOffset(HEADER_HEIGHT)

  win.webContents.on('dom-ready', function () {
    menu.onToggleFullScreen()
  })

  win.on('blur', function () {
    menu.onWindowHide()
    tray.onWindowHide()
  })

  win.on('focus', function () {
    menu.onWindowShow()
    tray.onWindowShow()
  })

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
}

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}

function toggleFullScreen (flag) {
  if (!main.win || !main.win.isVisible()) {
    return
  }

  if (flag == null) flag = !main.win.isFullScreen()

  log('toggleFullScreen %s', flag)

  if (flag) {
    // Fullscreen behaves oddly unless the aspect ratio is disabled. (OS X)
    main.win.setAspectRatio(0)
  }

  main.win.setFullScreen(flag)
}

function send (...args) {
  if (!main.win) return
  main.win.send(...args)
}

function show () {
  if (!main.win) return
  main.win.show()
}

function hide () {
  if (!main.win) return
  main.win.hide()
}

function focus () {
  if (!main.win) return
  util.focusWindow(main.win)
}
