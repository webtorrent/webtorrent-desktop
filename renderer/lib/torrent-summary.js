module.exports = {
  getPosterPath,
  getTorrentPath,
  getByKey,
  getTorrentID,
  getFileOrFolder
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

// Returns the path to either the file (in a single-file torrent) or the root
// folder (in  multi-file torrent)
// WARNING: assumes that multi-file torrents consist of a SINGLE folder.
// TODO: make this assumption explicit, enforce it in the `create-torrent`
// module. Store root folder explicitly to avoid hacky path processing below.
function getFileOrFolder (torrentSummary) {
  var ts = torrentSummary
  return path.join(ts.path, ts.files[0].path.split('/')[0])
}
