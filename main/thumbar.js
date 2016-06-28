module.exports = {
  disable,
  enable,
  onPlayerPause,
  onPlayerPlay
}

/**
 * On Windows, add a "thumbnail toolbar" with a play/pause button in the taskbar.
 * This provides users a way to access play/pause functionality without restoring
 * or activating the window.
 */

var path = require('path')
var config = require('../config')

var windows = require('./windows')

/**
 * Show the Windows thumbnail toolbar buttons.
 */
function enable () {
  update(false)
}

/**
 * Hide the Windows thumbnail toolbar buttons.
 */
function disable () {
  windows.main.win.setThumbarButtons([])
}

function onPlayerPause () {
  update(true)
}

function onPlayerPlay () {
  update(false)
}

function update (isPaused) {
  var icon = isPaused
    ? 'PlayThumbnailBarButton.png'
    : 'PauseThumbnailBarButton.png'

  var buttons = [
    {
      tooltip: isPaused ? 'Play' : 'Pause',
      icon: path.join(config.STATIC_PATH, icon),
      click: () => windows.main.dispatch('playPause')
    }
  ]
  windows.main.win.setThumbarButtons(buttons)
}
