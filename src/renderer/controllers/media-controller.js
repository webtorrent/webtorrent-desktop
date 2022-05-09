import { ipcRenderer } from 'electron'
import telemetry from '../lib/telemetry.js'
import Playlist from '../lib/playlist.js'

export default class MediaController {
  constructor (state) {
    this.state = state
  }

  mediaSuccess () {
    telemetry.logPlayAttempt('success')
  }

  mediaStalled () {
    this.state.playing.isStalled = true
  }

  mediaError (error) {
    const state = this.state
    if (state.location.url() === 'player') {
      telemetry.logPlayAttempt('error')
      state.playing.location = 'error'
      ipcRenderer.send('checkForExternalPlayer', state.saved.prefs.externalPlayerPath)
      ipcRenderer.once('checkForExternalPlayer', (e, isInstalled) => {
        state.modal = {
          id: 'unsupported-media-modal',
          error,
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

  controlsMouseEnter () {
    this.state.playing.mouseInControls = true
    this.state.playing.mouseStationarySince = new Date().getTime()
  }

  controlsMouseLeave () {
    this.state.playing.mouseInControls = false
    this.state.playing.mouseStationarySince = new Date().getTime()
  }

  openExternalPlayer () {
    const state = this.state
    state.playing.location = 'external'

    const onServerRunning = () => {
      state.playing.isReady = true
      telemetry.logPlayAttempt('external')

      const mediaURL = Playlist.getCurrentLocalURL(state)
      ipcRenderer.send('openExternalPlayer',
        state.saved.prefs.externalPlayerPath,
        mediaURL,
        state.window.title)
    }

    if (state.server != null) onServerRunning()
    else ipcRenderer.once('wt-server-running', onServerRunning)
  }

  externalPlayerNotFound () {
    const modal = this.state.modal
    if (modal && modal.id === 'unsupported-media-modal') {
      modal.externalPlayerNotFound = true
    }
  }
}
