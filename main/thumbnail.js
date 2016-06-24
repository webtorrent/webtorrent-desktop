module.exports = {
  hide,
  show,
  update
}

var path = require('path')
var config = require('../config')

var windows = require('./windows')

// gets called on player open
function show () {
  update(false)
}

// gets called on player close
function hide () {
  windows.main.win.setThumbarButtons([])
}

function update (isPaused) {
  var icon = isPaused ? 'PlayThumbnailBarButton.png' : 'PauseThumbnailBarButton.png'
  var tooltip = isPaused ? 'Play' : 'Pause'
  var buttons = [
    {
      tooltip: tooltip,
      icon: path.join(config.STATIC_PATH, icon),
      click: function () {
        windows.main.dispatch('playPause')
      }
    }
  ]
  windows.main.win.setThumbarButtons(buttons)
}
