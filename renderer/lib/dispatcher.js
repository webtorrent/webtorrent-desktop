module.exports = {
  setDispatch,
  dispatch,
  dispatcher
}

// Memoize most of our event handlers, which are functions in the form
// () => dispatch(<args>)
// ... this prevents virtual-dom from updating every listener on every update()
var _dispatchers = {}

var _dispatch = () => {}

function setDispatch (dispatch) {
  _dispatch = dispatch
}

// Get a _memoized event handler that calls dispatch()
// All args must be JSON-able
function dispatcher (...args) {
  var str = JSON.stringify(args)
  var handler = _dispatchers[str]
  if (!handler) {
    handler = _dispatchers[str] = function (e) {
      // Do not propagate click to elements below the button
      e.stopPropagation()

      if (e.currentTarget.classList.contains('disabled')) {
        // Do not allow clicks on disabled buttons
        return
      }

      _dispatch.apply(null, args)
    }
  }
  return handler
}

function dispatch (...args) {
  _dispatch.apply(null, args)
}
