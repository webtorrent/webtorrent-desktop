module.exports = {
  showPlayerThumbnailBar,
  hidePlayerThumbnailBar
}

var electron = require('electron')

var window = electron.BrowserWindow
var path = require('path')

var windows = require('./windows')

function showPlayerThumbnailBar () {
  var focusedWindow = window.getFocusedWindow()
  if (!focusedWindow) {
    return
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
  var focusedWindow = window.getFocusedWindow()
  if (!focusedWindow) {
    return
  }
  focusedWindow.setThumbarButtons([])
}
