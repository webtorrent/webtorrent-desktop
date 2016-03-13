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
  return getContent()

  function getHeader() {
    return hx`<div class='header'>
      <div class='title'>Preferences</div>
    </div>`
  }

  function getContent() {
    return hx`<div class='content'>
      <div class='preferences-table'>
        <div class='label'>Download folder: </div>
        <div class='action'
        onclick=${(e) => dispatch('showSelectDownloadDirectory', e)}>
        ${'[downloadPath]'}</div>
      </div>
    </div>`
  }

  function onclick () {
    loop.update({ times: state.times + 1 })
  }
}

function getDefaultDownloadDirectory() {
  return
}

// Events from the UI never modify state directly. Instead they call dispatch()
function dispatch (action, ...args) {
  if (action === 'showSelectDownloadDirectory') {
    ipcRenderer.send('showSelectDownloadDirectory')
  }
}

function showSelectDownloadDirectory() {
  electron.dialog.showOpenDialog(windows.preferences, {
    title: 'Select a directory to save in.',
    defaultPath: '/Users',
    properties: [ 'openDirectory' ]
  }, function (directoryname) {
    windows.main.send('dispatch', 'setDefaultDownloadDirectory', directoryname)
  })
}
