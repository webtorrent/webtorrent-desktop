module.exports = {
  showPlayerThumbnailBar,
  hidePlayerThumbnailBar,
  updateThumbarButtons
}

var electron = require('electron')

var path = require('path')
var config = require('../config')

var window = electron.BrowserWindow
var windows = require('./windows')
var focusedWindow

// gets called on player open
function showPlayerThumbnailBar () {
  // save the window reference
  if (!focusedWindow) {
    focusedWindow = window.getFocusedWindow()
  }

  updateThumbarButtons(false)
}

// gets called on player close
function hidePlayerThumbnailBar () {
  focusedWindow.setThumbarButtons([])
}

function updateThumbarButtons (isPaused) {
  var icon = isPaused ? 'PlayThumbnailBarButton.png' : 'PauseThumbnailBarButton.png'
  var tooltip = isPaused ? 'Play' : 'Pause'
  var buttons = [
    {
      tooltip: tooltip,
      icon: path.join(config.STATIC_PATH, icon),
      click: function () {
        windows.main.send('dispatch', 'playPause')
      }
    }
  ]
  focusedWindow.setThumbarButtons(buttons)
}
