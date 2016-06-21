module.exports = {
  onPlayerClose,
  onPlayerOpen
}

var electron = require('electron')
var windows = require('./windows')

function onPlayerOpen () {
  // Register play/pause media key, available on some keyboards.
  electron.globalShortcut.register(
    'MediaPlayPause',
    () => windows.main.dispatch('playPause')
  )
  electron.globalShortcut.register(
    'MediaNextTrack',
    () => windows.main.dispatch('next')
  )
  electron.globalShortcut.register(
    'MediaPreviousTrack',
    () => windows.main.dispatch('prev')
  )
}

function onPlayerClose () {
  // Return the media key to the OS, so other apps can use it.
  electron.globalShortcut.unregister('MediaPlayPause')
  electron.globalShortcut.unregister('MediaNext')
  electron.globalShortcut.unregister('MediaPrev')
}
