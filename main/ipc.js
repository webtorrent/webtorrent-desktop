module.exports = {
  init
}

var electron = require('electron')

var app = electron.app
var ipcMain = electron.ipcMain
var powerSaveBlocker = electron.powerSaveBlocker

var log = require('./log')
var menu = require('./menu')
var windows = require('./windows')
var shortcuts = require('./shortcuts')

// has to be a number, not a boolean, and undefined throws an error
var powerSaveBlockID = 0

function init () {
  ipcMain.on('ipcReady', function (e) {
    app.ipcReady = true
    app.emit('ipcReady')
    setTimeout(function () {
      windows.main.show()
      try { console.timeEnd('init') } catch (err) {}
    }, 50)
  })

  ipcMain.on('showOpenTorrentFile', menu.showOpenTorrentFile)
  ipcMain.on('showCreateTorrent', menu.showCreateTorrent)

  ipcMain.on('setBounds', function (e, bounds, maximize) {
    setBounds(bounds, maximize)
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

  ipcMain.on('openItem', function (e, path) {
    log('opening file or folder: ' + path)
    electron.shell.openItem(path)
  })

  ipcMain.on('blockPowerSave', blockPowerSave)
  ipcMain.on('unblockPowerSave', unblockPowerSave)

  ipcMain.on('onPlayerOpen', function () {
    menu.onPlayerOpen()
    shortcuts.registerPlayerShortcuts()
  })
  ipcMain.on('onPlayerClose', function () {
    menu.onPlayerClose()
    shortcuts.unregisterPlayerShortcuts()
  })

  // Capture all events
  var oldEmit = ipcMain.emit
  ipcMain.emit = function (name, e, ...args) {
    // Relay messages between the main window and the WebTorrent hidden window
    if (name.startsWith('wt-')) {
      var recipient, recipientStr
      if (e.sender.browserWindowOptions.title === 'webtorrent-hidden-window') {
        recipient = windows.main
        recipientStr = 'main'
      } else {
        recipient = windows.webtorrent
        recipientStr = 'webtorrent'
      }
      console.log('sending %s to %s', name, recipientStr)
      recipient.send(name, ...args)
      return
    }

    // Emit all other events normally
    oldEmit.call(ipcMain, name, e, ...args)
  }
}

function setBounds (bounds, maximize) {
  // Do nothing in fullscreen
  if (!windows.main || windows.main.isFullScreen()) return

  // Maximize or minimize, if the second argument is present
  var willBeMaximized
  if (maximize === true) {
    if (!windows.main.isMaximized()) windows.main.maximize()
    willBeMaximized = true
  } else if (maximize === false) {
    if (windows.main.isMaximized()) windows.main.unmaximize()
    willBeMaximized = false
  } else {
    willBeMaximized = windows.main.isMaximized()
  }

  // Assuming we're not maximized or maximizing, set the window size
  if (!willBeMaximized) {
    windows.main.setBounds(bounds, true)
  }
}

function setAspectRatio (aspectRatio, extraSize) {
  log('setAspectRatio %o %o', aspectRatio, extraSize)
  if (windows.main) {
    windows.main.setAspectRatio(aspectRatio, extraSize)
  }
}

// Display string in dock badging area (OS X)
function setBadge (text) {
  log('setBadge %s', text)
  if (app.dock) app.dock.setBadge(String(text))
}

// Show progress bar. Valid range is [0, 1]. Remove when < 0; indeterminate when > 1.
function setProgress (progress) {
  log('setProgress %s', progress)
  if (windows.main) {
    windows.main.setProgressBar(progress)
  }
}

function blockPowerSave () {
  powerSaveBlockID = powerSaveBlocker.start('prevent-display-sleep')
  log('blockPowerSave %d', powerSaveBlockID)
}

function unblockPowerSave () {
  if (powerSaveBlocker.isStarted(powerSaveBlockID)) {
    powerSaveBlocker.stop(powerSaveBlockID)
    log('unblockPowerSave %d', powerSaveBlockID)
  }
}
