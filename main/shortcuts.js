module.exports = {
  init,
  onPlayerClose,
  onPlayerOpen
}

var electron = require('electron')
var localShortcut = require('electron-localshortcut')

var globalShortcut = electron.globalShortcut

var menu = require('./menu')
var windows = require('./windows')

function init () {
  // Alternate shortcuts. Most shortcuts are registered in menu,js, but Electron does not
  // support multiple shortcuts for a single menu item.
  localShortcut.register('CmdOrCtrl+Shift+F', menu.toggleFullScreen)
  localShortcut.register('Space', () => windows.main.send('dispatch', 'playPause'))

  // Hidden shortcuts, i.e. not shown in the menu
  localShortcut.register('Esc', () => windows.main.send('dispatch', 'escapeBack'))
}

function onPlayerOpen () {
  // Register special "media key" for play/pause, available on some keyboards
  globalShortcut.register(
    'MediaPlayPause',
    () => windows.main.send('dispatch', 'playPause')
  )
}

function onPlayerClose () {
  globalShortcut.unregister('MediaPlayPause')
}
