const electron = require('electron')

const ipcRenderer = electron.ipcRenderer

const Playlist = require('../lib/playlist')

// Controls local play back: the <video>/<audio> tag and VLC
// Does not control remote casting (Chromecast etc)
module.exports = class MediaController {
  constructor (state) {
    this.state = state
  }

  mediaSuccess () {
    this.state.playing.result = 'success'
  }

  mediaStalled () {
    this.state.playing.isStalled = true
  }

  mediaError (error) {
    const state = this.state
    if (state.location.url() === 'player') {
      state.playing.result = 'error'
      state.playing.location = 'error'
      ipcRenderer.send('checkForExternalPlayer', state.saved.prefs.externalPlayerPath)
      ipcRenderer.once('checkForExternalPlayer', function (e, isInstalled) {
        state.modal = {
          id: 'unsupported-media-modal',
          error: error,
          externalPlayerInstalled: isInstalled
        }
      })
    }
  }

  mediaTimeUpdate () {
    this.state.playing.lastTimeUpdate = new Date().getTime()
    this.state.playing.isStalled = false
  }

  mediaMouseMoved () {
    this.state.playing.mouseStationarySince = new Date().getTime()
  }

  openExternalPlayer () {
    const state = this.state
    const mediaURL = Playlist.getCurrentLocalURL(this.state)
    ipcRenderer.send('openExternalPlayer',
      state.saved.prefs.externalPlayerPath,
      mediaURL,
      state.window.title)
    state.playing.location = 'external'
  }

  externalPlayerNotFound () {
    const modal = this.state.modal
    if (modal && modal.id === 'unsupported-media-modal') {
      modal.externalPlayerNotFound = true
    }
  }
}
