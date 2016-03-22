module.exports = {
  isPlayable,
  isVideo,
  isAudio
}

var path = require('path')

/**
 * Determines whether a file in a torrent is audio/video we can play
 */
function isPlayable (file) {
  return isVideo(file) || isAudio(file)
}

function isVideo (file) {
  var ext = path.extname(file.name)
  return ['.mp4', '.m4v', '.webm', '.mov', '.mkv'].indexOf(ext) !== -1
}

function isAudio (file) {
  var ext = path.extname(file.name)
  return ['.mp3', '.aac', '.ogg', '.wav'].indexOf(ext) !== -1
}
