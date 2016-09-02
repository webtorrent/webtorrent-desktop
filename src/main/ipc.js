module.exports = {
  init
}

const electron = require('electron')

const app = electron.app

const dialog = require('./dialog')
const dock = require('./dock')
const handlers = require('./handlers')
const log = require('./log')
const menu = require('./menu')
const powerSaveBlocker = require('./power-save-blocker')
const shell = require('./shell')
const shortcuts = require('./shortcuts')
const externalPlayer = require('./external-player')
const windows = require('./windows')
const thumbar = require('./thumbar')
const startup = require('./startup')

// Messages from the main process, to be sent once the WebTorrent process starts
const messageQueueMainToWebTorrent = []

function init () {
  const ipc = electron.ipcMain

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
    menu.setPlayerOpen(true)
    powerSaveBlocker.enable()
    shortcuts.enable()
    thumbar.enable()
  })

  ipc.on('onPlayerUpdate', function (e, ...args) {
    menu.onPlayerUpdate(...args)
    thumbar.onPlayerUpdate(...args)
  })

  ipc.on('onPlayerClose', function () {
    menu.setPlayerOpen(false)
    powerSaveBlocker.disable()
    shortcuts.disable()
    thumbar.disable()
  })

  ipc.on('onPlayerPlay', function () {
    powerSaveBlocker.enable()
    thumbar.onPlayerPlay()
  })

  ipc.on('onPlayerPause', function () {
    powerSaveBlocker.disable()
    thumbar.onPlayerPause()
  })

  /**
   * Shell
   */

  ipc.on('openItem', (e, ...args) => shell.openItem(...args))
  ipc.on('showItemInFolder', (e, ...args) => shell.showItemInFolder(...args))
  ipc.on('moveItemToTrash', (e, ...args) => shell.moveItemToTrash(...args))

  /**
   * File handlers
   */
  ipc.on('setDefaultFileHandler', (e, flag) => {
    if (flag) handlers.install()
    else handlers.uninstall()
  })

  /**
   * Startup
   */
  ipc.on('setStartup', (e, flag) => {
    if (flag) startup.install()
    else startup.uninstall()
  })

  /**
   * Windows: Main
   */

  const main = windows.main

  ipc.on('setAspectRatio', (e, ...args) => main.setAspectRatio(...args))
  ipc.on('setBounds', (e, ...args) => main.setBounds(...args))
  ipc.on('setProgress', (e, ...args) => main.setProgress(...args))
  ipc.on('setTitle', (e, ...args) => main.setTitle(...args))
  ipc.on('show', () => main.show())
  ipc.on('toggleFullScreen', (e, ...args) => main.toggleFullScreen(...args))
  ipc.on('setAllowNav', (e, ...args) => menu.setAllowNav(...args))

  /**
   * External Media Player
   */

  ipc.on('checkForExternalPlayer', function (e, path) {
    externalPlayer.checkInstall(path, function (isInstalled) {
      windows.main.send('checkForExternalPlayer', isInstalled)
    })
  })

  ipc.on('openExternalPlayer', (e, ...args) => externalPlayer.spawn(...args))
  ipc.on('quitExternalPlayer', () => externalPlayer.kill())

  // Capture all events
  const oldEmit = ipc.emit
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
