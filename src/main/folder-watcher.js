import * as chokidar from 'chokidar'
import log from './log.js'

export class FolderWatcher {
  constructor ({ window, state }) {
    this.window = window
    this.state = state
    this.torrentsFolderPath = null
    this.watching = false
  }

  isEnabled () {
    return this.state.saved.prefs.autoAddTorrents
  }

  start () {
    // Stop watching previous folder before
    // start watching a new one.
    if (this.watching) this.stop()

    const torrentsFolderPath = this.state.saved.prefs.torrentsFolderPath
    this.torrentsFolderPath = torrentsFolderPath
    if (!torrentsFolderPath) return

    const glob = `${torrentsFolderPath}/**/*.torrent`
    log('Folder Watcher: watching: ', glob)

    const options = {
      ignoreInitial: true,
      awaitWriteFinish: true
    }
    this.watcher = chokidar.watch(glob, options)
    this.watcher
      .on('add', (path) => {
        log('Folder Watcher: added torrent: ', path)
        this.window.dispatch('addTorrent', path)
      })

    this.watching = true
  }

  stop () {
    log('Folder Watcher: stop.')
    if (!this.watching) return
    this.watcher.close()
    this.watching = false
  }
}
