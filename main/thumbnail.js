module.exports = {
  showPlayerThumbnailBar,
  hidePlayerThumbnailBar,
  updateThumbarButtons
}
var electron = require('electron')

var window = electron.BrowserWindow
var path = require('path')
var config = require('../config')

var windows = require('./windows')
var focusedWindow

function showPlayerThumbnailBar () {
  if (!focusedWindow) {
    focusedWindow = window.getFocusedWindow()
  }

  updateThumbarButtons(false)
}

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
