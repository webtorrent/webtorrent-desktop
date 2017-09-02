const path = require('path')
const ipcRenderer = require('electron').ipcRenderer

const TorrentSummary = require('../lib/torrent-summary')
const sound = require('../lib/sound')
const {dispatch} = require('../lib/dispatcher')

module.exports = class TorrentController {
  constructor (state) {
    this.state = state
  }

  torrentInfoHash (torrentKey, infoHash) {
    let torrentSummary = this.getTorrentSummary(torrentKey)
    console.log('got infohash for %s torrent %s',
      torrentSummary ? 'existing' : 'new', torrentKey)

    if (!torrentSummary) {
      const torrents = this.state.saved.torrents

      // Check if an existing (non-active) torrent has the same info hash
      if (torrents.find((t) => t.infoHash === infoHash)) {
        ipcRenderer.send('wt-stop-torrenting', infoHash)
        return dispatch('error', 'Cannot add duplicate torrent')
      }

      torrentSummary = {
        torrentKey: torrentKey,
        status: 'new'
      }
      torrents.unshift(torrentSummary)
      sound.play('ADD')
    }

    torrentSummary.infoHash = infoHash
    dispatch('update')
  }

  torrentWarning (torrentKey, message) {
    console.log('warning for torrent %s: %s', torrentKey, message)
  }

  torrentError (torrentKey, message) {
    // TODO: WebTorrent needs semantic errors
    if (message.startsWith('Cannot add duplicate torrent')) {
      // Remove infohash from the message
      message = 'Cannot add duplicate torrent'
    }
    dispatch('error', message)

    const torrentSummary = this.getTorrentSummary(torrentKey)
    if (torrentSummary) {
      console.log('Pausing torrent %s due to error: %s', torrentSummary.infoHash, message)
      torrentSummary.status = 'paused'
      dispatch('update')
    }
  }

  torrentMetadata (torrentKey, torrentInfo) {
    // Summarize torrent
    const torrentSummary = this.getTorrentSummary(torrentKey)
    torrentSummary.status = 'downloading'
    torrentSummary.name = torrentSummary.displayName || torrentInfo.name
    torrentSummary.path = torrentInfo.path
    torrentSummary.magnetURI = torrentInfo.magnetURI
    // TODO: make torrentInfo immutable, save separately as torrentSummary.info
    // For now, check whether torrentSummary.files has already been set:
    const hasDetailedFileInfo = torrentSummary.files && torrentSummary.files[0].path
    if (!hasDetailedFileInfo) {
      torrentSummary.files = torrentInfo.files
    }
    if (!torrentSummary.selections) {
      torrentSummary.selections = torrentSummary.files.map((x) => true)
    }
    dispatch('update')

    // Save the .torrent file, if it hasn't been saved already
    if (!torrentSummary.torrentFileName) ipcRenderer.send('wt-save-torrent-file', torrentKey)

    // Auto-generate a poster image, if it hasn't been generated already
    if (!torrentSummary.posterFileName) ipcRenderer.send('wt-generate-torrent-poster', torrentKey)
  }

  torrentDone (torrentKey, torrentInfo) {
    // Update the torrent summary
    const torrentSummary = this.getTorrentSummary(torrentKey)
    torrentSummary.status = 'seeding'

    // Notify the user that a torrent finished, but only if we actually DL'd at least part of it.
    // Don't notify if we merely finished verifying data files that were already on disk.
    if (torrentInfo.bytesReceived > 0) {
      if (!this.state.window.isFocused) {
        this.state.dock.badge += 1
      }

      // Avoid displaying notification if notifications are disabled.
      if (!this.state.saved.prefs.disableNotifications) {
        showDoneNotification(torrentSummary)
      }

      ipcRenderer.send('downloadFinished', getTorrentPath(torrentSummary))
    }

    dispatch('update')
  }

  torrentProgress (progressInfo) {
    // Overall progress across all active torrents, 0 to 1, or -1 to hide the progress bar
    // Hide progress bar when client has no torrents, or progress is 100%
    const progress = (!progressInfo.hasActiveTorrents || progressInfo.progress === 1)
      ? -1
      : progressInfo.progress

    // Show progress bar under the WebTorrent taskbar icon, on OSX
    this.state.dock.progress = progress

    // Update progress for each individual torrent
    progressInfo.torrents.forEach((p) => {
      const torrentSummary = this.getTorrentSummary(p.torrentKey)
      if (!torrentSummary) {
        console.log('warning: got progress for missing torrent %s', p.torrentKey)
        return
      }
      torrentSummary.progress = p
    })

    // TODO: Find an efficient way to re-enable this line, which allows subtitle
    //       files which are completed after a video starts to play to be added
    //       dynamically to the list of subtitles.
    // checkForSubtitles()
  }

  torrentFileModtimes (torrentKey, fileModtimes) {
    const torrentSummary = this.getTorrentSummary(torrentKey)
    if (!torrentSummary) throw new Error('Not saving modtimes for deleted torrent ' + torrentKey)
    torrentSummary.fileModtimes = fileModtimes
    dispatch('stateSave')
  }

  torrentFileSaved (torrentKey, torrentFileName) {
    console.log('torrent file saved %s: %s', torrentKey, torrentFileName)
    const torrentSummary = this.getTorrentSummary(torrentKey)
    torrentSummary.torrentFileName = torrentFileName
    dispatch('stateSave')
  }

  torrentPosterSaved (torrentKey, posterFileName) {
    const torrentSummary = this.getTorrentSummary(torrentKey)
    torrentSummary.posterFileName = posterFileName
    dispatch('stateSave')
  }

  torrentAudioMetadata (infoHash, index, info) {
    const torrentSummary = this.getTorrentSummary(infoHash)
    const fileSummary = torrentSummary.files[index]
    fileSummary.audioInfo = info
    dispatch('update')
  }

  torrentServerRunning (serverInfo) {
    this.state.server = serverInfo
  }

  // Gets a torrent summary {name, infoHash, status} from state.saved.torrents
  // Returns undefined if we don't know that infoHash
  getTorrentSummary (torrentKey) {
    return TorrentSummary.getByKey(this.state, torrentKey)
  }
}

function getTorrentPath (torrentSummary) {
  let itemPath = TorrentSummary.getFileOrFolder(torrentSummary)
  if (torrentSummary.files.length > 1) {
    itemPath = path.dirname(itemPath)
  }
  return itemPath
}

function showDoneNotification (torrent) {
  const notif = new window.Notification('Download Complete', {
    body: torrent.name,
    silent: true
  })

  notif.onclick = function () {
    ipcRenderer.send('show')
  }

  // Only play notification sound if player is inactive
  if (this.state.playing.isPaused) sound.play('DONE')
}
