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
  return [
    '.avi',
    '.m4v',
    '.mkv',
    '.mov',
    '.mp4',
    '.mpg',
    '.ogv',
    '.webm',
    '.wmv'
  ].includes(ext)
}

function isAudio (file) {
  var ext = path.extname(file.name).toLowerCase()
  return [
    '.aac',
    '.ac3',
    '.mp3',
    '.ogg',
    '.wav'
  ].includes(ext)
}

function isPlayableTorrent (torrentSummary) {
  return torrentSummary.files && torrentSummary.files.some(isPlayable)
}
