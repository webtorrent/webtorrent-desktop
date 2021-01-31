module.exports = {
  disable,
  enable
}

const { globalShortcut } = require('electron')
const windows = require('./windows')

function enable () {
  // Register play/pause media key, available on some keyboards.
  globalShortcut.register(
    'MediaPlayPause',
    () => windows.main.dispatch('playPause')
  )
  globalShortcut.register(
    'MediaNextTrack',
    () => windows.main.dispatch('nextTrack')
  )
  globalShortcut.register(
    'MediaPreviousTrack',
    () => windows.main.dispatch('previousTrack')
  )
}

function disable () {
  // Return the media key to the OS, so other apps can use it.
  globalShortcut.unregister('MediaPlayPause')
  globalShortcut.unregister('MediaNextTrack')
  globalShortcut.unregister('MediaPreviousTrack')
}
