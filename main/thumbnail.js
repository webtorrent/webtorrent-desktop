module.exports = {
  showPlayerThumbnailBar,
  hidePlayerThumbnailBar,
  updateThumbarButtons
}

var path = require('path')
var config = require('../config')

var windows = require('./windows')

// gets called on player open
function showPlayerThumbnailBar () {
  updateThumbarButtons(false)
}

// gets called on player close
function hidePlayerThumbnailBar () {
  windows.main.win.setThumbarButtons([])
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
  windows.main.win.setThumbarButtons(buttons)
}
