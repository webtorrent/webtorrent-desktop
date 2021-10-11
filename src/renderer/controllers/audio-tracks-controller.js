import { dispatch } from '../lib/dispatcher.js'

export default class AudioTracksController {
  constructor (state) {
    this.state = state
  }

  selectAudioTrack (ix) {
    this.state.playing.audioTracks.selectedIndex = ix
    dispatch('skip', 0.2) // HACK: hardcoded seek value for smooth audio change
  }

  toggleAudioTracksMenu () {
    const audioTracks = this.state.playing.audioTracks
    audioTracks.showMenu = !audioTracks.showMenu
  }
}
