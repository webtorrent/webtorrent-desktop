module.exports = LocationHistory

function LocationHistory () {
  if (!new.target) return new LocationHistory()
  this._history = []
  this._forward = []
  this._pending = null
}

LocationHistory.prototype.go = function (page) {
  console.log('go', page)
  this.clearForward()
  this._go(page)
}

LocationHistory.prototype._go = function (page) {
  if (this._pending) return
  if (page.onbeforeload) {
    this._pending = page
    page.onbeforeload((err) => {
      if (this._pending !== page) return /* navigation was cancelled */
      this._pending = null
      if (err) return
      this._history.push(page)
    })
  } else {
    this._history.push(page)
  }
}

LocationHistory.prototype.back = function () {
  if (this._history.length <= 1) return

  var page = this._history.pop()

  if (page.onbeforeunload) {
    page.onbeforeunload(() => {
      this._forward.push(page)
    })
  } else {
    this._forward.push(page)
  }
}

LocationHistory.prototype.forward = function () {
  if (this._forward.length === 0) return

  var page = this._forward.pop()
  this._go(page)
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
