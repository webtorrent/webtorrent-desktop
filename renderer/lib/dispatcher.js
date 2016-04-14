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
  var json = JSON.stringify(args)
  var handler = _dispatchers[json]
  if (!handler) {
    handler = _dispatchers[json] = (e) => {
      if (e && e.stopPropagation && e.currentTarget) {
        // Don't click on whatever is below the button
        e.stopPropagation()
        // Don't register clicks on disabled buttons
        if (e.currentTarget.classList.contains('disabled')) return
      }
      _dispatch.apply(null, args)
    }
  }
  return handler
}

function dispatch (...args) {
  _dispatch.apply(null, args)
}
