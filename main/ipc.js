var electron = require('electron')
var debug = require('debug')('webtorrent-app:ipcMain')
var ipcMain = electron.ipcMain
var windows = require('./windows')

module.exports = {
  init: init
}

function init () {
  ipcMain.on('addTorrentFromPaste', function (e) {
    addTorrentFromPaste()
  })

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

  ipcMain.on('toggleFullScreen', function (e) {
    windows.main.setFullScreen(!windows.main.isFullScreen())
  })
}

function addTorrentFromPaste () {
  debug('addTorrentFromPaste')
  var torrentIds = electron.clipboard.readText().split('\n')
  torrentIds.forEach(function (torrentId) {
    torrentId = torrentId.trim()
    if (torrentId.length === 0) return
    windows.main.send('addTorrent', torrentId)
  })
}

function setBounds (bounds) {
  debug('setBounds %o', bounds)
  if (windows.main) {
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
  electron.app.dock.setBadge(String(text))
}

// Show progress bar. Valid range is [0, 1]. Remove when < 0; indeterminate when > 1.
function setProgress (progress) {
  debug('setProgress %s', progress)
  if (windows.main) {
    windows.main.setProgressBar(progress)
  }
}
