module.exports = {
  init
}

var electron = require('electron')

var app = electron.app

var dialog = require('./dialog')
var dock = require('./dock')
var log = require('./log')
var menu = require('./menu')
var powerSaveBlocker = require('./power-save-blocker')
var shell = require('./shell')
var shortcuts = require('./shortcuts')
var vlc = require('./vlc')
var windows = require('./windows')

// Messages from the main process, to be sent once the WebTorrent process starts
var messageQueueMainToWebTorrent = []

// holds a ChildProcess while we're playing a video in VLC, null otherwise
var vlcProcess

function init () {
  var ipc = electron.ipcMain

  ipc.once('ipcReady', function (e) {
    app.ipcReady = true
    app.emit('ipcReady')
  })

  ipc.once('ipcReadyWebTorrent', function (e) {
    app.ipcReadyWebTorrent = true
    log('sending %d queued messages from the main win to the webtorrent window',
      messageQueueMainToWebTorrent.length)
    messageQueueMainToWebTorrent.forEach(function (message) {
      windows.webtorrent.send(message.name, ...message.args)
      log('webtorrent: sent queued %s', message.name)
    })
  })

  /**
   * Dialog
   */

  ipc.on('openTorrentFile', () => dialog.openTorrentFile())
  ipc.on('openFiles', () => dialog.openFiles())

  /**
   * Dock
   */

  ipc.on('setBadge', (e, ...args) => dock.setBadge(...args))
  ipc.on('downloadFinished', (e, ...args) => dock.downloadFinished(...args))

  /**
   * Events
   */

  ipc.on('onPlayerOpen', function () {
    menu.onPlayerOpen()
    shortcuts.onPlayerOpen()
  })

  ipc.on('onPlayerUpdate', function (e, ...args) {
    menu.onPlayerUpdate(...args)
  })

  ipc.on('onPlayerClose', function () {
    menu.onPlayerClose()
    shortcuts.onPlayerOpen()
  })

  /**
   * Power Save Blocker
   */

  ipc.on('blockPowerSave', () => powerSaveBlocker.start())
  ipc.on('unblockPowerSave', () => powerSaveBlocker.stop())

  /**
   * Shell
   */

  ipc.on('openItem', (e, ...args) => shell.openItem(...args))
  ipc.on('showItemInFolder', (e, ...args) => shell.showItemInFolder(...args))

  /**
   * Windows: Main
   */

  var main = windows.main

  ipc.on('setAspectRatio', (e, ...args) => main.setAspectRatio(...args))
  ipc.on('setBounds', (e, ...args) => main.setBounds(...args))
  ipc.on('setProgress', (e, ...args) => main.setProgress(...args))
  ipc.on('setTitle', (e, ...args) => main.setTitle(...args))
  ipc.on('show', () => main.show())
  ipc.on('toggleFullScreen', (e, ...args) => main.toggleFullScreen(...args))

  /**
   * VLC
   * TODO: Move most of this code to vlc.js
   */

  ipc.on('checkForVLC', function (e) {
    vlc.checkForVLC(function (isInstalled) {
      windows.main.send('checkForVLC', isInstalled)
    })
  })

  ipc.on('vlcPlay', function (e, url) {
    var args = ['--play-and-exit', '--video-on-top', '--no-video-title-show', '--quiet', url]
    log('Running vlc ' + args.join(' '))

    vlc.spawn(args, function (err, proc) {
      if (err) return windows.main.dispatch('vlcNotFound')
      vlcProcess = proc

      // If it works, close the modal after a second
      var closeModalTimeout = setTimeout(() =>
        windows.main.dispatch('exitModal'), 1000)

      vlcProcess.on('close', function (code) {
        clearTimeout(closeModalTimeout)
        if (!vlcProcess) return // Killed
        log('VLC exited with code ', code)
        if (code === 0) {
          windows.main.dispatch('vlcClosed')
        } else {
          windows.main.dispatch('vlcNotFound')
        }
        vlcProcess = null
      })

      vlcProcess.on('error', function (e) {
        log('VLC error', e)
      })
    })
  })

  ipc.on('vlcQuit', function () {
    if (!vlcProcess) return
    log('Killing VLC, pid ' + vlcProcess.pid)
    vlcProcess.kill('SIGKILL') // kill -9
    vlcProcess = null
  })

  // Capture all events
  var oldEmit = ipc.emit
  ipc.emit = function (name, e, ...args) {
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
    oldEmit.call(ipc, name, e, ...args)
  }
}
