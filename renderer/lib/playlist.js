var TorrentPlayer = require('./torrent-player')

module.exports = Playlist

function Playlist (torrentSummary) {
  this._position = 0
  this._tracks = extractTracks(torrentSummary)
  this._order = range(0, this._tracks.length)

  this._repeat = false
  this._shuffled = false
}

// =============================================================================
// Public methods
// =============================================================================

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

Playlist.prototype.shuffleEnabled = function () {
  return this._shuffled
}

Playlist.prototype.toggleShuffle = function (value) {
  this._shuffled = (value === undefined ? !this._shuffled : value)
  this._shuffled ? this._shuffle() : this._unshuffle()
}

Playlist.prototype.repeatEnabled = function () {
  return this._repeat
}

Playlist.prototype.toggleRepeat = function (value) {
  this._repeat = (value === undefined ? !this._repeat : value)
}

Playlist.prototype.jumpTo = function (infoHash, fileIndex) {
  this.setPosition(this._order.findIndex((i) => {
    let track = this._tracks[i]
    return track.infoHash === infoHash && track.fileIndex === fileIndex
  }))
  return this.getCurrent()
}

Playlist.prototype.getCurrent = function () {
  var position = this.getPosition()

  return position === undefined ? undefined
    : this._tracks[this._order[position]]
}

Playlist.prototype.getPosition = function () {
  if (this._position >= 0 && this._position < this._tracks.length) {
    return this._position
  } else return undefined
}

Playlist.prototype.setPosition = function (position) {
  this._position = position
}

// =============================================================================
// Private methods
// =============================================================================

Playlist.prototype._shuffle = function () {
  let order = this._order
  if (!order.length) return

  // Move the current track to the beggining of the playlist
  swap(order, 0, this._position)
  this._position = 0

  // Shuffle the rest of the tracks with Fisher-Yates Shuffle
  for (let i = order.length - 1; i > 0; --i) {
    let j = Math.floor(Math.random() * i) + 1
    swap(order, i, j)
  }
}

Playlist.prototype._unshuffle = function () {
  this._position = this._order[this._position]
  this._order = range(0, this._order.length)
}

// =============================================================================
// Utility fuctions
// =============================================================================

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

function range (begin, end) {
  return Array.apply(null, {length: end - begin}).map((v, i) => begin + i)
}

function swap (array, i, j) {
  let temp = array[i]
  array[i] = array[j]
  array[j] = temp
}

function mod (a, b) {
  return ((a % b) + b) % b
}
