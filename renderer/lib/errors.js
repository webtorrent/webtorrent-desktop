module.exports = {
  UnplayableError
}

function UnplayableError () {
  this.message = 'Can\'t play any files in torrent'
}
UnplayableError.prototype = Error
