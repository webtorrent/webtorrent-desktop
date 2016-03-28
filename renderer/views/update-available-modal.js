module.exports = UpdateAvailableModal

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var electron = require('electron')

var {dispatch} = require('../lib/dispatcher')

function UpdateAvailableModal (state) {
  return hx`
    <div class='update-available-modal'>
      <p><strong>A new version of WebTorrent is available: v${state.modal.version}</strong></p>
      <p>We have an auto-updater for Windows and Mac, but not yet for Linux, so you'll have to download it manually. Sorry.</p>
      <p>
        <button class='primary' onclick=${handleOK}>Show Download Page</button>
        <button class='cancel' onclick=${handleCancel}>Skip This Release</button>
      </p>
    </div>
  `
}

function handleKeyPress (e) {
  if (e.which === 13) handleOK() /* hit Enter to submit */
}

function handleOK () {
  electron.shell.openExternal('https://github.com/feross/webtorrent-desktop/releases')
  dispatch('exitModal')
}

function handleCancel () {
  dispatch('skipVersion', state.modal.version)
  dispatch('exitModal')
}
