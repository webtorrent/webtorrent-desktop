module.exports = {
  getPosterPath,
  getTorrentPath,
  getByKey,
  getTorrentID
}

var path = require('path')
var config = require('../../config')

// Expects a torrentSummary
// Returns an absolute path to the torrent file, or null if unavailable
function getTorrentPath (torrentSummary) {
  if (!torrentSummary || !torrentSummary.torrentFileName) return null
  return path.join(config.TORRENT_PATH, torrentSummary.torrentFileName)
}

// Expects a torrentSummary
// Returns an absolute path to the poster image, or null if unavailable
function getPosterPath (torrentSummary) {
  if (!torrentSummary || !torrentSummary.posterFileName) return null
  var posterPath = path.join(config.POSTER_PATH, torrentSummary.posterFileName)
  // Work around a Chrome bug (reproduced in vanilla Chrome, not just Electron):
  // Backslashes in URLS in CSS cause bizarre string encoding issues
  return posterPath.replace(/\\/g, '/')
}

// Expects a torrentSummary
// Returns a torrentID: filename, magnet URI, or infohash
function getTorrentID (torrentSummary) {
  var s = torrentSummary
  if (s.torrentFileName) { // Load torrent file from disk
    return getTorrentPath(s)
  } else { // Load torrent from DHT
    return s.magnetURI || s.infoHash
  }
}

// Expects a torrentKey or infoHash
// Returns the corresponding torrentSummary, or undefined
function getByKey (state, torrentKey) {
  if (!torrentKey) return undefined
  return state.saved.torrents.find((x) =>
    x.torrentKey === torrentKey || x.infoHash === torrentKey)
}
