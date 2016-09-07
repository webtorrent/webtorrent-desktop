const ExtendableError = require('es6-error')

/* Generic errors */

class CastingError extends ExtendableError {}
class PlaybackError extends ExtendableError {}
class SoundError extends ExtendableError {}
class TorrentError extends ExtendableError {}

/* Playback */

class UnplayableTorrentError extends PlaybackError {
  constructor () { super('Can\'t play any files in torrent') }
}

class UnplayableFileError extends PlaybackError {
  constructor () { super('Can\'t play that file') }
}

class PlaybackTimedOutError extends PlaybackError {
  constructor () { super('Playback timed out. Try again.') }
}

/* Sound */

class InvalidSoundNameError extends SoundError {
  constructor (name) { super(`Invalid sound name: ${name}`) }
}

/* Torrent */

class TorrentKeyNotFoundError extends TorrentError {
  constructor (torrentKey) { super(`Can't resolve torrent key ${torrentKey}`) }
}

class InvalidTorrentError extends TorrentError {}

/* Miscellaneous */

class IllegalArgumentError extends ExtendableError {}

module.exports = {
  CastingError,
  PlaybackError,
  SoundError,
  TorrentError,
  UnplayableTorrentError,
  UnplayableFileError,
  PlaybackTimedOutError,
  InvalidSoundNameError,
  TorrentKeyNotFoundError,
  InvalidTorrentError,
  IllegalArgumentError
}
