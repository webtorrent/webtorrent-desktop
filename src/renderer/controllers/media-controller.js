const electron = require('electron')

const ipcRenderer = electron.ipcRenderer

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
    var state = this.state
    if (state.location.url() === 'player') {
      state.playing.result = 'error'
      state.playing.location = 'error'
      ipcRenderer.send('checkForVLC')
      ipcRenderer.once('checkForVLC', function (e, isInstalled) {
        state.modal = {
          id: 'unsupported-media-modal',
          error: error,
          vlcInstalled: isInstalled
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

  vlcPlay () {
    ipcRenderer.send('vlcPlay', this.state.server.localURL, this.state.window.title)
    this.state.playing.location = 'vlc'
  }

  vlcNotFound () {
    var modal = this.state.modal
    if (modal && modal.id === 'unsupported-media-modal') {
      modal.vlcNotFound = true
    }
  }
}
