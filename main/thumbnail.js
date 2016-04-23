module.exports = {
  showPlayerThumbnailBar,
  hidePlayerThumbnailBar
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

  focusedWindow.setThumbarButtons([
    {
      tooltip: "playPause",
      icon: path.join(config.STATIC_PATH, 'PauseThumbnailBarButton.png'),
      click: function () {
        windows.main.send('dispatch', 'playPause')
      }
    }
  ])
}

function hidePlayerThumbnailBar () {
  focusedWindow.setThumbarButtons([])
}
