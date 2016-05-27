module.exports = {
  focusWindow
}

function focusWindow (win) {
  if (win.isMinimized()) {
    // TODO: can this be removed?
    win.restore()
  }
  win.show() // shows and gives focus
}
