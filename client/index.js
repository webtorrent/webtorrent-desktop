var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')

var state = {
  count: 0
}

// Init app
var currentVDom = App(state)
var rootElement = createElement(currentVDom)
document.body.appendChild(rootElement)

function update () {
  var newVDom = App(state)
  var patches = diff(currentVDom, newVDom)
  rootElement = patch(rootElement, patches)
  currentVDom = newVDom
}

setInterval(function () {
  state.count += 1
  update()
}, 1000)
