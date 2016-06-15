module.exports = {
  isPlayable,
  isVideo,
  isAudio,
  isPlayableTorrent,
  getPlaylist,
  getNeighbors
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
    '.webm'
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

function getPlaylist (torrentSummary) {
  return torrentSummary.files.filter(isPlayable)
    .map((file, index) => ({ file, index }))
    .sort(function (a, b) {
      if (a.file.name < b.file.name) return -1
      if (b.file.name < a.file.name) return 1
      return 0
    })
    .map((object) => object.index)
}

function getNeighbors (torrentSummary, fileIndex) {
  var playlist = getPlaylist(torrentSummary)
  var index = playlist.findIndex((i) => i === fileIndex)

  return {
    prev: index > 0 ? playlist[index - 1] : null,
    next: index < playlist.length ? playlist[index + 1] : null
  }
}
