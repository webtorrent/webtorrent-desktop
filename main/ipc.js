module.exports = {
  init: init
}

var debug = require('debug')('webtorrent-app:ipcMain')
var electron = require('electron')
var ipcMain = electron.ipcMain
var menu = require('./menu')
var windows = require('./windows')

function init () {
  ipcMain.on('setBounds', function (e, bounds) {
    setBounds(bounds)
  })

  ipcMain.on('setAspectRatio', function (e, aspectRatio, extraSize) {
    setAspectRatio(aspectRatio, extraSize)
  })

  ipcMain.on('setBadge', function (e, text) {
    setBadge(text)
  })

  ipcMain.on('setProgress', function (e, progress) {
    setProgress(progress)
  })

  ipcMain.on('toggleFullScreen', function (e, flag) {
    menu.toggleFullScreen(flag)
  })

  ipcMain.on('setTitle', function (e, title) {
    windows.main.setTitle(title)
  })

  ipcMain.on('log', function (e, message) {
    console.log(message)
  })
}

function setBounds (bounds) {
  debug('setBounds %o', bounds)
  if (windows.main && !windows.main.isFullScreen() && !windows.main.isMaximized()) {
    windows.main.setBounds(bounds, true)
  }
}

function setAspectRatio (aspectRatio, extraSize) {
  debug('setAspectRatio %o %o', aspectRatio, extraSize)
  if (windows.main) {
    windows.main.setAspectRatio(aspectRatio, extraSize)
  }
}

// Display string in dock badging area (OS X)
function setBadge (text) {
  debug('setBadge %s', text)
  if (electron.app.dock) electron.app.dock.setBadge(String(text))
}

// Show progress bar. Valid range is [0, 1]. Remove when < 0; indeterminate when > 1.
function setProgress (progress) {
  debug('setProgress %s', progress)
  if (windows.main) {
    windows.main.setProgressBar(progress)
  }
}
