import electron from '../../electron.cjs'

import log from './log.js'
import menu from './menu.js'
import * as windows from './windows/index.js'

const { app, ipcMain } = electron

// Messages from the main process, to be sent once the WebTorrent process starts
const messageQueueMainToWebTorrent = []

// Will hold modules injected from the app that will be used on fired
// IPC events.
const modules = {}

function setModule (name, module) {
  modules[name] = module
}

function init () {
  ipcMain.once('ipcReady', e => {
    app.ipcReady = true
    app.emit('ipcReady')
  })

  ipcMain.once('ipcReadyWebTorrent', e => {
    app.ipcReadyWebTorrent = true
    log('sending %d queued messages from the main win to the webtorrent window',
      messageQueueMainToWebTorrent.length)
    messageQueueMainToWebTorrent.forEach(message => {
      windows.webtorrent.send(message.name, ...message.args)
      log('webtorrent: sent queued %s', message.name)
    })
  })

  /**
   * Dialog
   */

  ipcMain.on('openTorrentFile', async () => {
    const dialog = await import('./dialog')
    dialog.openTorrentFile()
  })
  ipcMain.on('openFiles', async () => {
    const dialog = await import('./dialog')
    dialog.openFiles()
  })

  /**
   * Dock
   */

  ipcMain.on('setBadge', async (e, ...args) => {
    const dock = await import('./dock')
    dock.setBadge(...args)
  })
  ipcMain.on('downloadFinished', async (e, ...args) => {
    const dock = await import('./dock')
    dock.downloadFinished(...args)
  })

  /**
   * Player Events
   */

  ipcMain.on('onPlayerOpen', async () => {
    const powerSaveBlocker = await import('./power-save-blocker')
    const shortcuts = await import('./shortcuts')
    const thumbar = await import('./thumbar')

    menu.togglePlaybackControls(true)
    powerSaveBlocker.enable()
    shortcuts.enable()
    thumbar.enable()
  })

  ipcMain.on('onPlayerUpdate', async (e, ...args) => {
    const thumbar = await import('./thumbar')

    menu.onPlayerUpdate(...args)
    thumbar.onPlayerUpdate(...args)
  })

  ipcMain.on('onPlayerClose', async () => {
    const powerSaveBlocker = await import('./power-save-blocker')
    const shortcuts = await import('./shortcuts')
    const thumbar = await import('./thumbar')

    menu.togglePlaybackControls(false)
    powerSaveBlocker.disable()
    shortcuts.disable()
    thumbar.disable()
  })

  ipcMain.on('onPlayerPlay', async () => {
    const powerSaveBlocker = await import('./power-save-blocker')
    const thumbar = await import('./thumbar')

    powerSaveBlocker.enable()
    thumbar.onPlayerPlay()
  })

  ipcMain.on('onPlayerPause', async () => {
    const powerSaveBlocker = await import('./power-save-blocker')
    const thumbar = await import('./thumbar')

    powerSaveBlocker.disable()
    thumbar.onPlayerPause()
  })

  /**
   * Folder Watcher Events
   */

  ipcMain.on('startFolderWatcher', () => {
    if (!modules.folderWatcher) {
      log('IPC ERR: folderWatcher module is not defined.')
      return
    }

    modules.folderWatcher.start()
  })

  ipcMain.on('stopFolderWatcher', () => {
    if (!modules.folderWatcher) {
      log('IPC ERR: folderWatcher module is not defined.')
      return
    }

    modules.folderWatcher.stop()
  })

  /**
   * Shell
   */

  ipcMain.on('openPath', async (e, ...args) => {
    const shell = await import('./shell')
    shell.openPath(...args)
  })
  ipcMain.on('showItemInFolder', async (e, ...args) => {
    const shell = await import('./shell')
    shell.showItemInFolder(...args)
  })
  ipcMain.on('moveItemToTrash', async (e, ...args) => {
    const shell = await import('./shell')
    shell.moveItemToTrash(...args)
  })

  /**
   * File handlers
   */

  ipcMain.on('setDefaultFileHandler', async (e, flag) => {
    const handlers = await import('./handlers')

    if (flag) handlers.install()
    else handlers.uninstall()
  })

  /**
   * Auto start on login
   */

  ipcMain.on('setStartup', async (e, flag) => {
    const startup = await import('./startup')

    if (flag) startup.install()
    else startup.uninstall()
  })

  /**
   * Windows: Main
   */

  const main = windows.main

  ipcMain.on('setAspectRatio', (e, ...args) => main.setAspectRatio(...args))
  ipcMain.on('setBounds', (e, ...args) => main.setBounds(...args))
  ipcMain.on('setProgress', (e, ...args) => main.setProgress(...args))
  ipcMain.on('setTitle', (e, ...args) => main.setTitle(...args))
  ipcMain.on('show', () => main.show())
  ipcMain.on('toggleFullScreen', (e, ...args) => main.toggleFullScreen(...args))
  ipcMain.on('setAllowNav', (e, ...args) => menu.setAllowNav(...args))

  /**
   * External Media Player
   */

  ipcMain.on('checkForExternalPlayer', async (e, path) => {
    const externalPlayer = await import('./external-player')

    externalPlayer.checkInstall(path, err => {
      windows.main.send('checkForExternalPlayer', !err)
    })
  })

  ipcMain.on('openExternalPlayer', async (e, ...args) => {
    const externalPlayer = await import('./external-player')
    const shortcuts = await import('./shortcuts')
    const thumbar = await import('./thumbar')

    menu.togglePlaybackControls(false)
    shortcuts.disable()
    thumbar.disable()
    externalPlayer.spawn(...args)
  })

  ipcMain.on('quitExternalPlayer', async () => {
    const externalPlayer = await import('./external-player')
    externalPlayer.kill()
  })

  /**
   * Message passing
   */

  const oldEmit = ipcMain.emit
  ipcMain.emit = (name, e, ...args) => {
    // Relay messages between the main window and the WebTorrent hidden window
    if (name.startsWith('wt-') && !app.isQuitting) {
      console.dir(e.sender.getTitle())
      if (e.sender.getTitle() === 'WebTorrent Hidden Window') {
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
          name,
          args
        })
        log('webtorrent: queueing %s', name)
      }
      return
    }

    // Emit all other events normally
    oldEmit.call(ipcMain, name, e, ...args)
  }
}

export { init }
export { setModule }
export default {
  init,
  setModule
}
