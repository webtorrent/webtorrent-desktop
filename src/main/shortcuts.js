module.exports = {
  disable,
  enable
}

const electron = require('electron')
const windows = require('./windows')

function enable () {
  // Register play/pause media key, available on some keyboards.
  electron.globalShortcut.register(
    'MediaPlayPause',
    () => windows.main.dispatch('playPause')
  )
  electron.globalShortcut.register(
    'MediaNextTrack',
    () => windows.main.dispatch('nextTrack')
  )
  electron.globalShortcut.register(
    'MediaPreviousTrack',
    () => windows.main.dispatch('previousTrack')
  )
}

function disable () {
  // Return the media key to the OS, so other apps can use it.
  electron.globalShortcut.unregister('MediaPlayPause')
  electron.globalShortcut.unregister('MediaNextTrack')
  electron.globalShortcut.unregister('MediaPreviousTrack')
}
