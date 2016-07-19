module.exports = LocationHistory

function LocationHistory () {
  this._history = []
  this._forward = []
  this._pending = false
}

LocationHistory.prototype.url = function () {
  return this.current() && this.current().url
}

LocationHistory.prototype.current = function () {
  return this._history[this._history.length - 1]
}

LocationHistory.prototype.go = function (page, cb) {
  if (!cb) cb = noop
  if (this._pending) return cb(null)

  console.log('go', page)

  this.clearForward()
  this._go(page, cb)
}

LocationHistory.prototype.back = function (cb) {
  var self = this
  if (!cb) cb = noop
  if (self._history.length <= 1 || self._pending) return cb(null)

  var page = self._history.pop()
  self._unload(page, done)

  function done (err) {
    if (err) return cb(err)
    self._forward.push(page)
    self._load(self.current(), cb)
  }
}

LocationHistory.prototype.hasBack = function () {
  return this._history.length > 1
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
  if (self._history.length <= 1) return cb(null)

  self.back(function (err) {
    if (err) return cb(err)
    self.backToFirst(cb)
  })
}

LocationHistory.prototype._go = function (page, cb) {
  var self = this
  if (!cb) cb = noop

  self._unload(self.current(), done1)

  function done1 (err) {
    if (err) return cb(err)
    self._load(page, done2)
  }

  function done2 (err) {
    if (err) return cb(err)
    self._history.push(page)
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

LocationHistory.prototype._unload = function (page, cb) {
  var self = this
  self._pending = true

  if (page && page.onbeforeunload) page.onbeforeunload(done)
  else done(null)

  function done (err) {
    self._pending = false
    cb(err)
  }
}

function noop () {}
