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
}

function onPlayerClose () {
  // Return the media key to the OS, so other apps can use it.
  electron.globalShortcut.unregister('MediaPlayPause')
}
