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
var thumbnail = require('./thumbnail')

// has to be a number, not a boolean, and undefined throws an error
var powerSaveBlockID = 0

function init () {
  ipcMain.on('ipcReady', function (e) {
    app.ipcReady = true
    app.emit('ipcReady')
    windows.main.show()
    console.timeEnd('init')
  })

  var messageQueueMainToWebTorrent = []
  ipcMain.on('ipcReadyWebTorrent', function (e) {
    app.ipcReadyWebTorrent = true
    log('sending %d queued messages from the main win to the webtorrent window',
      messageQueueMainToWebTorrent.length)
    messageQueueMainToWebTorrent.forEach(function (message) {
      windows.webtorrent.send(message.name, ...message.args)
      log('webtorrent: sent queued %s', message.name)
    })
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

  ipcMain.on('updateThumbnailBar', function (e, isPaused) {
    thumbnail.updateThumbarButtons(isPaused)
  })

  ipcMain.on('onPlayerOpen', function () {
    menu.onPlayerOpen()
    shortcuts.registerPlayerShortcuts()
  })
  ipcMain.on('onPlayerClose', function () {
    menu.onPlayerClose()
    shortcuts.unregisterPlayerShortcuts()
  })

  ipcMain.on('focusWindow', function (e, windowName) {
    windows.focusWindow(windows[windowName])
  })

  // Capture all events
  var oldEmit = ipcMain.emit
  ipcMain.emit = function (name, e, ...args) {
    // Relay messages between the main window and the WebTorrent hidden window
    if (name.startsWith('wt-') && !app.isQuitting) {
      if (e.sender.browserWindowOptions.title === 'webtorrent-hidden-window') {
        // Send message to main window
        windows.main.send(name, ...args)
        log('webtorrent: got %s', name)
      } else if (app.ipcReadyWebTorrent) {
        // Send message to webtorrent window
        windows.webtorrent.send(name, ...args)
        log('webtorrent: sent %s', name)
      } else {
        // Queue message for webtorrent window, it hasn't finished loading yet
        messageQueueMainToWebTorrent.push({
          name: name,
          args: args
        })
        log('webtorrent: queueing %s', name)
      }
      return
    }

    // Emit all other events normally
    oldEmit.call(ipcMain, name, e, ...args)
  }
}

function setBounds (bounds, maximize) {
  // Do nothing in fullscreen
  if (!windows.main || windows.main.isFullScreen()) {
    log('setBounds: not setting bounds because we\'re in full screen')
    return
  }

  // Maximize or minimize, if the second argument is present
  var willBeMaximized
  if (maximize === true) {
    if (!windows.main.isMaximized()) {
      log('setBounds: maximizing')
      windows.main.maximize()
    }
    willBeMaximized = true
  } else if (maximize === false) {
    if (windows.main.isMaximized()) {
      log('setBounds: unmaximizing')
      windows.main.unmaximize()
    }
    willBeMaximized = false
  } else {
    willBeMaximized = windows.main.isMaximized()
  }

  // Assuming we're not maximized or maximizing, set the window size
  if (!willBeMaximized) {
    log('setBounds: setting bounds to ' + JSON.stringify(bounds))
    windows.main.setBounds(bounds, true)
  } else {
    log('setBounds: not setting bounds because of window maximization')
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
