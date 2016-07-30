module.exports = {
  isPlayable,
  isVideo,
  isAudio,
  isTorrent,
  isPlayableTorrentSummary,
  pickFileToPlay
}

var path = require('path')

// Checks whether a fileSummary or file path is audio/video that we can play,
// based on the file extension
function isPlayable (file) {
  return isVideo(file) || isAudio(file)
}

// Checks whether a fileSummary or file path is playable video
function isVideo (file) {
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
  ].includes(getFileExtension(file))
}

// Checks whether a fileSummary or file path is playable audio
function isAudio (file) {
  return [
    '.aac',
    '.ac3',
    '.mp3',
    '.ogg',
    '.wav'
  ].includes(getFileExtension(file))
}

// Checks if the argument is either:
// - a string that's a valid filename ending in .torrent
// - a file object where obj.name is ends in .torrent
// - a string that's a magnet link (magnet://...)
function isTorrent (file) {
  var isTorrentFile = getFileExtension(file) === '.torrent'
  var isMagnet = typeof file === 'string' && /^(stream-)?magnet:/.test(file)
  return isTorrentFile || isMagnet
}

function getFileExtension (file) {
  var name = typeof file === 'string' ? file : file.name
  return path.extname(name).toLowerCase()
}

function isPlayableTorrentSummary (torrentSummary) {
  return torrentSummary.files && torrentSummary.files.some(isPlayable)
}

// Picks the default file to play from a list of torrent or torrentSummary files
// Returns an index or undefined, if no files are playable
function pickFileToPlay (files) {
  // Play the first video file
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
