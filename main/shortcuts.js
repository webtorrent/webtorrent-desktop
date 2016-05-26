module.exports = {
  onPlayerClose,
  onPlayerOpen
}

var electron = require('electron')
var windows = require('./windows')

function onPlayerOpen () {
  // Register special "media key" for play/pause, available on some keyboards
  electron.globalShortcut.register(
    'MediaPlayPause',
    () => windows.main.send('dispatch', 'playPause')
  )
}

function onPlayerClose () {
  electron.globalShortcut.unregister('MediaPlayPause')
}
