module.exports = {
  UnplayableTorrentError,
  UnplayableFileError
}

function UnplayableTorrentError () {
  this.message = 'Can\'t play any files in torrent'
}

function UnplayableFileError () {
  this.message = 'Can\'t play that file'
}

UnplayableTorrentError.prototype = Error
UnplayableFileError.prototype = Error
