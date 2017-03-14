module.exports = {
  disable,
  enable,
  onPlayerPause,
  onPlayerPlay,
  onPlayerUpdate
}

/**
 * On Windows, add a "thumbnail toolbar" with a play/pause button in the taskbar.
 * This provides users a way to access play/pause functionality without restoring
 * or activating the window.
 */

const path = require('path')
const config = require('../config')

const windows = require('./windows')

const PREV_ICON = path.join(config.STATIC_PATH, 'PreviousTrackThumbnailBarButton.png')
const PLAY_ICON = path.join(config.STATIC_PATH, 'PlayThumbnailBarButton.png')
const PAUSE_ICON = path.join(config.STATIC_PATH, 'PauseThumbnailBarButton.png')
const NEXT_ICON = path.join(config.STATIC_PATH, 'NextTrackThumbnailBarButton.png')

// Array indices for each button
const PREV = 0
const PLAY_PAUSE = 1
const NEXT = 2

let buttons = []

/**
 * Show the Windows thumbnail toolbar buttons.
 */
function enable () {
  buttons = [
    {
      tooltip: 'Previous Track',
      icon: PREV_ICON,
      click: () => windows.main.dispatch('previousTrack')
    },
    {
      tooltip: 'Pause',
      icon: PAUSE_ICON,
      click: () => windows.main.dispatch('playPause')
    },
    {
      tooltip: 'Next Track',
      icon: NEXT_ICON,
      click: () => windows.main.dispatch('nextTrack')
    }
  ]
  update()
}

/**
 * Hide the Windows thumbnail toolbar buttons.
 */
function disable () {
  buttons = []
  update()
}

function onPlayerPause () {
  if (!isEnabled()) return
  buttons[PLAY_PAUSE].tooltip = 'Play'
  buttons[PLAY_PAUSE].icon = PLAY_ICON
  update()
}

function onPlayerPlay () {
  if (!isEnabled()) return
  buttons[PLAY_PAUSE].tooltip = 'Pause'
  buttons[PLAY_PAUSE].icon = PAUSE_ICON
  update()
}

function onPlayerUpdate (state) {
  if (!isEnabled()) return
  buttons[PREV].flags = [ state.hasPrevious ? 'enabled' : 'disabled' ]
  buttons[NEXT].flags = [ state.hasNext ? 'enabled' : 'disabled' ]
  update()
}

function isEnabled () {
  return buttons.length > 0
}

function update () {
  windows.main.win.setThumbarButtons(buttons)
}
