module.exports = {
  dispatch,
  dispatcher,
  setDispatch
}

var dispatchers = {}
var _dispatch = function () {}

function setDispatch (dispatch) {
  _dispatch = dispatch
}

function dispatch (...args) {
  _dispatch(...args)
}

// Most DOM event handlers are trivial functions like `() => dispatch(<args>)`.
// For these, `dispatcher(<args>)` is preferred because it memoizes the handler
// function. This prevents React from updating the listener functions on
// each update().
function dispatcher (...args) {
  var str = JSON.stringify(args)
  var handler = dispatchers[str]
  if (!handler) {
    handler = dispatchers[str] = function (e) {
      // Do not propagate click to elements below the button
      e.stopPropagation()

      if (e.currentTarget.classList.contains('disabled')) {
        // Ignore clicks on disabled elements
        return
      }

      dispatch(...args)
    }
  }
  return handler
}
