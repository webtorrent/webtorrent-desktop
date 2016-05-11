module.exports = {
  init,
  onPlayerClose,
  onPlayerOpen
}

var electron = require('electron')

var menu = require('./menu')
var windows = require('./windows')

function init () {
  var localShortcut = require('electron-localshortcut')

  // Alternate shortcuts. Most shortcuts are registered in menu,js, but Electron
  // does not support multiple shortcuts for a single menu item.
  localShortcut.register('CmdOrCtrl+Shift+F', menu.toggleFullScreen)
  localShortcut.register('Space', () => windows.main.send('dispatch', 'playPause'))

  // Hidden shortcuts, i.e. not shown in the menu
  localShortcut.register('Esc', () => windows.main.send('dispatch', 'escapeBack'))
}

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
