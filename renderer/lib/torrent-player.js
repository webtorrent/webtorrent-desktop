module.exports = {
  isPlayable,
  isVideo,
  isAudio,
  isPlayableTorrent
}

var path = require('path')

/**
 * Determines whether a file in a torrent is audio/video we can play
 */
function isPlayable (file) {
  return isVideo(file) || isAudio(file)
}

function isVideo (file) {
  var ext = path.extname(file.name).toLowerCase()
  return ['.mp4', '.m4v', '.webm', '.mov', '.mkv', '.avi'].indexOf(ext) !== -1
}

function isAudio (file) {
  var ext = path.extname(file.name).toLowerCase()
  return ['.mp3', '.aac', '.ogg', '.wav', '.ac3'].indexOf(ext) !== -1
}

function isPlayableTorrent (torrentSummary) {
  return torrentSummary.files && torrentSummary.files.some(isPlayable)
}
