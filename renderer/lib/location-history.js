module.exports = LocationHistory

function LocationHistory () {
  this._back = []
  this._current = null
  this._forward = []
  this._pending = false
}

LocationHistory.prototype.url = function () {
  return this.current() && this.current().url
}

LocationHistory.prototype.current = function () {
  return this._current
}

LocationHistory.prototype.go = function (page, cb) {
  if (!cb) cb = noop
  if (this._pending) return cb(null)

  if (process.env.NODE_ENV !== 'test') {
    console.log('go', page)
  }

  this.clearForward()
  this._go(page, cb)
}

LocationHistory.prototype.back = function (cb) {
  var self = this
  if (!cb) cb = noop
  if (self._back.length < 1 || self._pending) return cb(null)

  let previous = self._back.pop()
  let current = self.current()
  self._load(previous, done)

  function done (err) {
    if (err) return cb(err)
    self._forward.push(current)
    self._current = previous
    self._unload(current)
    cb(null)
  }
}

LocationHistory.prototype.hasBack = function () {
  return this._back.length
}

LocationHistory.prototype.forward = function (cb) {
  if (!cb) cb = noop
  if (this._forward.length === 0 || this._pending) return cb(null)

  var page = this._forward.pop()
  this._go(page, cb)
}

LocationHistory.prototype.hasForward = function () {
  return this._forward.length > 0
}

LocationHistory.prototype.clearForward = function (url) {
  if (url == null) {
    this._forward = []
  } else {
    console.log(this._forward)
    console.log(url)
    this._forward = this._forward.filter(function (page) {
      return page.url !== url
    })
  }
}

LocationHistory.prototype.backToFirst = function (cb) {
  var self = this
  if (!cb) cb = noop
  if (self._back.length < 1) return cb(null)

  self.back(function (err) {
    if (err) return cb(err)
    self.backToFirst(cb)
  })
}

LocationHistory.prototype._go = function (page, cb) {
  var self = this
  if (!cb) cb = noop

  let current = self.current()
  self._load(page, done)

  function done (err) {
    if (err) return cb(err)
    if (current) self._back.push(current)
    self._current = page
    self._unload(current)
    cb(null)
  }
}

LocationHistory.prototype._load = function (page, cb) {
  var self = this
  self._pending = true

  if (page && page.onbeforeload) page.onbeforeload(done)
  else done(null)

  function done (err) {
    self._pending = false
    cb(err)
  }
}

LocationHistory.prototype._unload = function (page) {
  var self = this
  self._pending = true

  if (page && page.onafterunload) page.onafterunload()

  self._pending = false
}

function noop () {}
