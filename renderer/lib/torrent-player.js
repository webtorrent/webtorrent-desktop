module.exports = {
  isPlayable,
  isVideo,
  isAudio,
  isPlayableTorrent,
  pickFileToPlay
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

// Picks the default file to play from a list of torrent or torrentSummary files
// Returns an index or undefined, if no files are playable
// Play the first video file
function pickFileToPlay (files) {
  var videoFiles = files.filter(isVideo)
  if (videoFiles.length > 0) {
    return files.indexOf(videoFiles[0])
  }

  // if there are no videos, play the first audio file
  var audioFiles = files.filter(isAudio)
  if (audioFiles.length > 0) {
    return files.indexOf(audioFiles[0])
  }

  // no video or audio means nothing is playable
  return undefined
}
