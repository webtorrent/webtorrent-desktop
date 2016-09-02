const electron = require('electron')
const path = require('path')

const Cast = require('../lib/cast')
const {dispatch} = require('../lib/dispatcher')
const telemetry = require('../lib/telemetry')
const errors = require('../lib/errors')
const sound = require('../lib/sound')
const TorrentPlayer = require('../lib/torrent-player')
const TorrentSummary = require('../lib/torrent-summary')
const Playlist = require('../lib/playlist')
const State = require('../lib/state')

const ipcRenderer = electron.ipcRenderer

// Controls playback of torrents and files within torrents
// both local (<video>,<audio>,external player) and remote (cast)
module.exports = class PlaybackController {
  constructor (state, config, update) {
    this.state = state
    this.config = config
    this.update = update
  }

  // Play a file in a torrent.
  // * Start torrenting, if necessary
  // * Stream, if not already fully downloaded
  // * If no file index is provided, restore the most recently viewed file or autoplay the first
  playFile (infoHash, index /* optional */) {
    var state = this.state
    if (state.location.url() === 'player') {
      this.updatePlayer(infoHash, index, false, (err) => {
        if (err) dispatch('error', err)
        else this.play()
      })
    } else {
      state.location.go({
        url: 'player',
        setup: (cb) => {
          this.play()
          this.openPlayer(infoHash, index, (err) => {
            if (!err) this.play
            cb(err)
          })
        },
        destroy: () => this.closePlayer()
      }, (err) => {
        if (err) dispatch('error', err)
      })
    }
  }

  // Open a file in OS default app.
  openItem (infoHash, index) {
    var torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    var filePath = path.join(
      torrentSummary.path,
      torrentSummary.files[index].path)
    ipcRenderer.send('openItem', filePath)
  }

  // Toggle (play or pause) the currently playing media
  playPause () {
    var state = this.state
    if (state.location.url() !== 'player') return

    // force rerendering if window is hidden,
    // in order to bypass `raf` and play/pause media immediately
    var mediaTag = document.querySelector('video,audio')
    if (!state.window.isVisible && mediaTag) {
      if (state.playing.isPaused) mediaTag.play()
      else mediaTag.pause()
    }

    if (state.playing.isPaused) this.play()
    else this.pause()
  }

  // Play next file in list (if any)
  nextTrack () {
    var state = this.state
    if (Playlist.hasNext(state)) {
      this.updatePlayer(
          state.playing.infoHash, Playlist.getNextIndex(state), false, (err) => {
            if (err) dispatch('error', err)
            else this.play()
          })
    }
  }

  // Play previous track in list (if any)
  previousTrack () {
    var state = this.state
    if (Playlist.hasPrevious(state)) {
      this.updatePlayer(
        state.playing.infoHash, Playlist.getPreviousIndex(state), false, (err) => {
          if (err) dispatch('error', err)
          else this.play()
        })
    }
  }

  // Play (unpause) the current media
  play () {
    var state = this.state
    if (!state.playing.isPaused) return
    state.playing.isPaused = false
    if (isCasting(state)) {
      Cast.play()
    }
    ipcRenderer.send('onPlayerPlay')
  }

  // Pause the currently playing media
  pause () {
    var state = this.state
    if (state.playing.isPaused) return
    state.playing.isPaused = true
    if (isCasting(state)) {
      Cast.pause()
    }
    ipcRenderer.send('onPlayerPause')
  }

  // Skip specified number of seconds (backwards if negative)
  skip (time) {
    this.skipTo(this.state.playing.currentTime + time)
  }

  // Skip (aka seek) to a specific point, in seconds
  skipTo (time) {
    if (!Number.isFinite(time)) {
      console.error('Tried to skip to a non-finite time ' + time)
      return console.trace()
    }
    if (isCasting(this.state)) Cast.seek(time)
    else this.state.playing.jumpToTime = time
  }

  // Change playback speed. 1 = faster, -1 = slower
  // Playback speed ranges from 16 (fast forward) to 1 (normal playback)
  // to 0.25 (quarter-speed playback), then goes to -0.25, -0.5, -1, -2, etc
  // until -16 (fast rewind)
  changePlaybackRate (direction) {
    var state = this.state
    var rate = state.playing.playbackRate
    if (direction > 0 && rate >= 0.25 && rate < 2) {
      rate += 0.25
    } else if (direction < 0 && rate > 0.25 && rate <= 2) {
      rate -= 0.25
    } else if (direction < 0 && rate === 0.25) { /* when we set playback rate at 0 in html 5, playback hangs ;( */
      rate = -1
    } else if (direction > 0 && rate === -1) {
      rate = 0.25
    } else if ((direction > 0 && rate >= 1 && rate < 16) || (direction < 0 && rate > -16 && rate <= -1)) {
      rate *= 2
    } else if ((direction < 0 && rate > 1 && rate <= 16) || (direction > 0 && rate >= -16 && rate < -1)) {
      rate /= 2
    }
    state.playing.playbackRate = rate
    if (isCasting(state) && !Cast.setRate(rate)) {
      state.playing.playbackRate = 1
    }
  }

  // Change the volume, in range [0, 1], by some amount
  // For example, volume muted (0), changeVolume (0.3) increases to 30% volume
  changeVolume (delta) {
    // change volume with delta value
    this.setVolume(this.state.playing.volume + delta)
  }

  // Set the volume to some value in [0, 1]
  setVolume (volume) {
    // check if its in [0.0 - 1.0] range
    volume = Math.max(0, Math.min(1, volume))

    var state = this.state
    if (isCasting(state)) {
      Cast.setVolume(volume)
    } else {
      state.playing.setVolume = volume
    }
  }

  // Hide player controls while playing video, if the mouse stays still for a while
  // Never hide the controls when:
  // * The mouse is over the controls or we're scrubbing (see CSS)
  // * The video is paused
  // * The video is playing remotely on Chromecast or Airplay
  showOrHidePlayerControls () {
    var state = this.state
    var hideControls = state.location.url() === 'player' &&
      state.playing.mouseStationarySince !== 0 &&
      new Date().getTime() - state.playing.mouseStationarySince > 2000 &&
      !state.playing.isPaused &&
      state.playing.location === 'local'

    if (hideControls !== state.playing.hideControls) {
      state.playing.hideControls = hideControls
      return true
    }
    return false
  }

  // Opens the video player to a specific torrent
  openPlayer (infoHash, index, cb) {
    var state = this.state

    var torrentSummary = TorrentSummary.getByKey(state, infoHash)

    if (index === undefined) index = torrentSummary.mostRecentFileIndex
    if (index === undefined) index = torrentSummary.files.findIndex(TorrentPlayer.isPlayable)
    if (index === undefined) return cb(new errors.UnplayableError())

    state.playing.infoHash = torrentSummary.infoHash

    // update UI to show pending playback
    if (torrentSummary.progress !== 1) sound.play('PLAY')
    // TODO: remove torrentSummary.playStatus
    torrentSummary.playStatus = 'requested'
    this.update()

    var timeout = setTimeout(() => {
      telemetry.logPlayAttempt('timeout')
      // TODO: remove torrentSummary.playStatus
      torrentSummary.playStatus = 'timeout' /* no seeders available? */
      sound.play('ERROR')
      cb(new Error('Playback timed out. Try again.'))
      this.update()
    }, 10000) /* give it a few seconds */

    this.startServer(torrentSummary, () => {
      clearTimeout(timeout)

      // if we timed out (user clicked play a long time ago), don't autoplay
      var timedOut = torrentSummary.playStatus === 'timeout'
      delete torrentSummary.playStatus
      if (timedOut) {
        ipcRenderer.send('wt-stop-server')
        return this.update()
      }

      ipcRenderer.send('onPlayerOpen')
      this.updatePlayer(infoHash, index, true, cb)
    })
  }

  // Starts WebTorrent server for media streaming
  startServer (torrentSummary, cb) {
    if (torrentSummary.status === 'paused') {
      dispatch('startTorrentingSummary', torrentSummary.torrentKey)
      ipcRenderer.once('wt-ready-' + torrentSummary.infoHash,
        () => onTorrentReady())
    } else {
      onTorrentReady()
    }

    function onTorrentReady () {
      ipcRenderer.send('wt-start-server', torrentSummary.infoHash)
      ipcRenderer.once('wt-server-' + torrentSummary.infoHash, () => cb())
    }
  }

  // Called each time the current file changes
  updatePlayer (infoHash, index, resume, cb) {
    var state = this.state

    var torrentSummary = TorrentSummary.getByKey(state, infoHash)
    var fileSummary = torrentSummary.files[index]

    if (!TorrentPlayer.isPlayable(fileSummary)) {
      torrentSummary.mostRecentFileIndex = undefined
      return cb(new Error('Can\'t play that file'))
    }

    torrentSummary.mostRecentFileIndex = index

    // update state
    state.playing.fileIndex = index
    state.playing.type = TorrentPlayer.isVideo(fileSummary) ? 'video'
      : TorrentPlayer.isAudio(fileSummary) ? 'audio'
      : 'other'

    // pick up where we left off
    var jumpToTime = 0
    if (resume && fileSummary.currentTime) {
      var fraction = fileSummary.currentTime / fileSummary.duration
      var secondsLeft = fileSummary.duration - fileSummary.currentTime
      if (fraction < 0.9 && secondsLeft > 10) {
        jumpToTime = fileSummary.currentTime
      }
    }
    state.playing.jumpToTime = jumpToTime

    // if it's audio, parse out the metadata (artist, title, etc)
    if (state.playing.type === 'audio' && !fileSummary.audioInfo) {
      ipcRenderer.send('wt-get-audio-metadata', torrentSummary.infoHash, index)
    }

    // if it's video, check for subtitles files that are done downloading
    dispatch('checkForSubtitles')

    // enable previously selected subtitle track
    if (fileSummary.selectedSubtitle) {
      dispatch('addSubtitles', [fileSummary.selectedSubtitle], true)
    }

    state.window.title = fileSummary.name

    // play in VLC if set as default player (Preferences / Playback / Play in VLC)
    if (this.state.saved.prefs.openExternalPlayer) {
      dispatch('openExternalPlayer')
      this.update()
      cb()
      return
    }

    // otherwise, play the video
    this.update()

    ipcRenderer.send('onPlayerUpdate', Playlist.hasNext(state), Playlist.hasPrevious(state))
    cb()
  }

  closePlayer () {
    console.log('closePlayer')

    // Quit any external players, like Chromecast/Airplay/etc or VLC
    var state = this.state
    if (isCasting(state)) {
      Cast.stop()
    }
    if (state.playing.location === 'external') {
      ipcRenderer.send('quitExternalPlayer')
    }

    // Save volume (this session only, not in state.saved)
    state.previousVolume = state.playing.volume

    // Telemetry: track what happens after the user clicks play
    var result = state.playing.result // 'success' or 'error'
    if (result === 'success') telemetry.logPlayAttempt('success') // first frame displayed
    else if (result === 'error') telemetry.logPlayAttempt('error') // codec missing, etc
    else if (result === undefined) telemetry.logPlayAttempt('abandoned') // user exited before first frame
    else console.error('Unknown state.playing.result', state.playing.result)

    // Reset the window contents back to the home screen
    state.playing = State.getDefaultPlayState()
    state.server = null

    // Reset the window size and location back to where it was
    if (state.window.isFullScreen) {
      dispatch('toggleFullScreen', false)
    }
    restoreBounds(state)

    // Tell the WebTorrent process to kill the torrent-to-HTTP server
    ipcRenderer.send('wt-stop-server')

    ipcRenderer.send('onPlayerClose')

    this.update()
  }
}

// Checks whether we are connected and already casting
// Returns false if we not casting (state.playing.location === 'local')
// or if we're trying to connect but haven't yet ('chromecast-pending', etc)
function isCasting (state) {
  return state.playing.location === 'chromecast' ||
    state.playing.location === 'airplay' ||
    state.playing.location === 'dlna'
}

function restoreBounds (state) {
  ipcRenderer.send('setAspectRatio', 0)
  if (state.window.bounds) {
    ipcRenderer.send('setBounds', state.window.bounds, false)
  }
}
