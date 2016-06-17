var TorrentPlayer = require('./torrent-player')

module.exports = Playlist

function Playlist (torrentSummary) {
  this._position = 0
  this._tracks = extractTracks(torrentSummary)
  this._repeat = false
}

Playlist.prototype.getTracks = function () {
  return this._tracks
}

Playlist.prototype.hasNext = function () {
  return !this._tracks.length ? false
        : this._repeat ? true
        : this._position + 1 < this._tracks.length
}

Playlist.prototype.hasPrevious = function () {
  return !this._tracks.length ? false
        : this._repeat ? true
        : this._position > 0
}

Playlist.prototype.next = function () {
  if (this.hasNext()) {
    this._position = mod(this._position + 1, this._tracks.length)
    return this.getCurrent()
  }
}

Playlist.prototype.previous = function () {
  if (this.hasPrevious()) {
    this._position = mod(this._position - 1, this._tracks.length)
    return this.getCurrent()
  }
}

Playlist.prototype.repeatEnabled = function () {
  return this._repeat
}

Playlist.prototype.toggleRepeat = function (value) {
  this._repeat = (value === undefined ? !this._repeat : value)
}

Playlist.prototype.jumpTo = function (infoHash, fileIndex) {
  this.setPosition(this._tracks.findIndex(
    (track) => track.infoHash === infoHash && track.fileIndex === fileIndex
  ))
  return this.getCurrent()
}

Playlist.prototype.getCurrent = function () {
  var position = this.getPosition()
  return position === undefined ? undefined : this._tracks[position]
}

Playlist.prototype.getPosition = function () {
  if (this._position >= 0 && this._position < this._tracks.length) {
    return this._position
  } else return undefined
}

Playlist.prototype.setPosition = function (position) {
  this._position = position
}

function extractTracks (torrentSummary) {
  return torrentSummary.files.map((file, index) => ({ file, index }))
    .filter((object) => TorrentPlayer.isPlayable(object.file))
    .sort(function (a, b) {
      if (a.file.name < b.file.name) return -1
      if (b.file.name < a.file.name) return 1
      return 0
    })
    .map((object) => ({
      infoHash: torrentSummary.infoHash,
      fileIndex: object.index,
      type: TorrentPlayer.isVideo(object.file) ? 'video'
          : TorrentPlayer.isAudio(object.file) ? 'audio'
          : 'other'
    }))
}

function mod (a, b) {
  return ((a % b) + b) % b
}
