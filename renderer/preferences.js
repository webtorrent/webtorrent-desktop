var electron = require('electron')

var vdom = require('virtual-dom')
var hyperx = require('hyperx')
var hx = hyperx(vdom.h)

var main = require('main-loop')
var loop = main({ times: 0 }, render, vdom)

// Electron apps have two processes: a main process (node) runs first and starts
// a renderer process (essentially a Chrome window). We're in the renderer process,
// and this IPC channel receives from and sends messages to the main process
var ipcRenderer = electron.ipcRenderer

document.querySelector('body').appendChild(loop.target)

function render (state) {
  return hx`
  <div class='app'>
    ${getHeader()}
    <div class='content'>${getContent()}</div>
  </div>`

  function getHeader () {
    return hx`<div class='header'>
      <div class='title'>Preferences</div>
    </div>`
  }

  function getContent () {
    return hx`
      <div class='preferences-table'>
        <div class='label'>Download location: </div>
        <div class='action'>
        ${'[downloadPath]'}
        <input type='button'
        onclick=${(e) => dispatch('showSelectDownloadDirectory', e)}
        value="Change">
        </div>
      </div>
    `
  }
}

// Events from the UI never modify state directly. Instead they call dispatch()
function dispatch (action, ...args) {
  if (action === 'showSelectDownloadDirectory') {
    ipcRenderer.send('showSelectDownloadDirectory')
  }
}
