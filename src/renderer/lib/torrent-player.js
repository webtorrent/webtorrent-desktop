module.exports = {
  isPlayable,
  isVideo,
  isAudio,
  isTorrent,
  isMagnetLink,
  isPlayableTorrentSummary
}

const path = require('path')

const mediaExtensions = require('./media-extensions')

// Checks whether a fileSummary or file path is audio/video that we can play,
// based on the file extension
function isPlayable (file) {
  return isVideo(file) || isAudio(file)
}

// Checks whether a fileSummary or file path is playable video
function isVideo (file) {
  return mediaExtensions.video.includes(getFileExtension(file))
}

// Checks whether a fileSummary or file path is playable audio
function isAudio (file) {
  return mediaExtensions.audio.includes(getFileExtension(file))
}

// Checks if the argument is either:
// - a string that's a valid filename ending in .torrent
// - a file object where obj.name is ends in .torrent
// - a string that's a magnet link (magnet://...)
function isTorrent (file) {
  return isTorrentFile(file) || isMagnetLink(file)
}

function isTorrentFile (file) {
  return getFileExtension(file) === '.torrent'
}

function isMagnetLink (link) {
  return typeof link === 'string' && /^(stream-)?magnet:/.test(link)
}

function getFileExtension (file) {
  const name = typeof file === 'string' ? file : file.name
  return path.extname(name).toLowerCase()
}

function isPlayableTorrentSummary (torrentSummary) {
  return torrentSummary.files && torrentSummary.files.some(isPlayable)
}
