module.exports = UpdateAvailableModal

var electron = require('electron')

var {dispatch} = require('../lib/dispatcher')
var hx = require('../lib/hx')

function UpdateAvailableModal (state) {
  return hx`
    <div class='update-available-modal'>
      <p><strong>A new version of WebTorrent is available: v${state.modal.version}</strong></p>
      <p>We have an auto-updater for Windows and Mac. We don't have one for Linux yet, so you'll have to download the new version manually.</p>
      <p class='float-right'>
        <button class='button button-flat' onclick=${handleCancel}>Skip This Release</button>
        <button class='button button-raised' onclick=${handleOK}>Show Download Page</button>
      </p>
    </div>
  `

  function handleOK () {
    electron.shell.openExternal('https://github.com/feross/webtorrent-desktop/releases')
    dispatch('exitModal')
  }

  function handleCancel () {
    dispatch('skipVersion', state.modal.version)
    dispatch('exitModal')
  }
}
