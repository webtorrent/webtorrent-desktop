const chokidar = require('chokidar')
const log = require('./log')

class FolderWatcher {
  constructor ({window, state}) {
    this.window = window
    this.state = state
    this.torrentsFolderPath
  }

  init () {
    const torrentsFolderPath = this.state.saved.prefs.torrentsFolderPath
    this.torrentsFolderPath = torrentsFolderPath
    if (!torrentsFolderPath) return

    const glob = `${torrentsFolderPath}/**/*.torrent`
    log('Folder Watcher: watching: ', glob)

    const options = {ignoreInitial: true}
    this.watcher = chokidar.watch(glob, options)
    this.watcher
      .on('add', (path) => {
        log('-- torrent added: ', path)
        this.window.dispatch('addTorrent', path)
      })
  }

  start (torrentsFolderPath) {
    // Stop watching previous folder before
    // start watching a new one.
    if (this.torrentsFolderPath) {
      this.stop()
    }

    const glob = `${torrentsFolderPath}/**/*.torrent`
    log('Folder Watcher: watching: ', glob)

    const options = {ignoreInitial: true}
    this.watcher = chokidar.watch(glob, options)
    this.watcher
      .on('add', (path) => {
        log('-- torrent added: ', path)
        this.window.dispatch('addTorrent', path)
      })
  }

  stop () {
    if (!this.watcher) return
    this.watcher.close()
  }
}

module.exports = FolderWatcher
