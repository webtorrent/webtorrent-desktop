module.exports = {
  isPlayable,
  isVideo,
  isAudio,
  isTorrent,
  isPlayableTorrentSummary
}

const path = require('path')

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
    '.aiff',
    '.ape',
    '.ac3',
    '.flac',
    '.m4a',
    '.mp2',
    '.mp3',
    '.oga',
    '.ogg',
    '.opus',
    '.wav',
    '.wma'
  ].includes(getFileExtension(file))
}

// Checks if the argument is either:
// - a string that's a valid filename ending in .torrent
// - a file object where obj.name is ends in .torrent
// - a string that's a magnet link (magnet://...)
function isTorrent (file) {
  const isTorrentFile = getFileExtension(file) === '.torrent'
  const isMagnet = typeof file === 'string' && /^(stream-)?magnet:/.test(file)
  return isTorrentFile || isMagnet
}

function getFileExtension (file) {
  const name = typeof file === 'string' ? file : file.name
  return path.extname(name).toLowerCase()
}

function isPlayableTorrentSummary (torrentSummary) {
  return torrentSummary.files && torrentSummary.files.some(isPlayable)
}
