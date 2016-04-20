module.exports = LocationHistory

function LocationHistory () {
  if (!new.target) return new LocationHistory()
  this._history = []
  this._forward = []
  this._pending = null
}

LocationHistory.prototype.go = function (page, cb) {
  console.log('go', page)
  this.clearForward()
  this._go(page, cb)
}

LocationHistory.prototype._go = function (page, cb) {
  if (this._pending) return
  if (page.onbeforeload) {
    this._pending = page
    page.onbeforeload((err) => {
      if (this._pending !== page) return /* navigation was cancelled */
      this._pending = null
      if (err) {
        if (cb) cb(err)
        return
      }
      this._history.push(page)
      if (cb) cb()
    })
  } else {
    this._history.push(page)
    if (cb) cb()
  }
}

LocationHistory.prototype.back = function (cb) {
  if (this._history.length <= 1) return

  var page = this._history.pop()

  if (page.onbeforeunload) {
    // TODO: this is buggy. If the user clicks back twice, then those pages
    // may end up in _forward in the wrong order depending on which onbeforeunload
    // call finishes first.
    page.onbeforeunload(() => {
      this._forward.push(page)
      if (cb) cb()
    })
  } else {
    this._forward.push(page)
    if (cb) cb()
  }
}

LocationHistory.prototype.forward = function (cb) {
  if (this._forward.length === 0) return

  var page = this._forward.pop()
  this._go(page, cb)
}

LocationHistory.prototype.clearForward = function () {
  this._forward = []
}

LocationHistory.prototype.current = function () {
  return this._history[this._history.length - 1]
}

LocationHistory.prototype.hasBack = function () {
  return this._history.length > 1
}

LocationHistory.prototype.hasForward = function () {
  return this._forward.length > 0
}

LocationHistory.prototype.pending = function () {
  return this._pending
}

LocationHistory.prototype.clearPending = function () {
  this._pending = null
}
