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
  // ⌘+Shift+F is an alternative fullscreen shortcut to the ones defined in menu.js.
  // Electron does not support multiple accelerators for a single menu item, so this
  // is registered separately here.
  localShortcut.register('CmdOrCtrl+Shift+F', menu.toggleFullScreen)
}

function onPlayerOpen () {
  // Register special "media key" for play/pause, available on some keyboards
  globalShortcut.register('MediaPlayPause', function () {
    windows.main.send('dispatch', 'playPause')
  })
}

function onPlayerClose () {
  globalShortcut.unregister('MediaPlayPause')
}
