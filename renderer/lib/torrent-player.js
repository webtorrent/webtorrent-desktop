module.exports = {
  isPlayable: isPlayable
}

var path = require('path')

/**
 * Determines whether a file in a torrent is audio/video we can play
 */
function isPlayable (file) {
  var extname = path.extname(file.name)
  return ['.mp4', '.m4v', '.webm', '.mov', '.mkv'].indexOf(extname) !== -1
}
