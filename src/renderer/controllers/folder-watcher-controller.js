const { ipcRenderer } = require('electron')

module.exports = class FolderWatcherController {
  start () {
    console.log('-- IPC: start folder watcher')
    ipcRenderer.send('startFolderWatcher')
  }

  stop () {
    console.log('-- IPC: stop folder watcher')
    ipcRenderer.send('stopFolderWatcher')
  }
}
