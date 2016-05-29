module.exports = UnsupportedMediaModal

var electron = require('electron')

var {dispatch, dispatcher} = require('../lib/dispatcher')
var hx = require('../lib/hx')

function UnsupportedMediaModal (state) {
  var err = state.modal.error
  var message = (err && err.getMessage)
    ? err.getMessage()
    : err
  var actionButton = state.modal.vlcInstalled
    ? hx`<button class="button-raised" onclick=${onPlay}>Play in VLC</button>`
    : hx`<button class="button-raised" onclick=${onInstall}>Install VLC</button>`
  var vlcMessage = state.modal.vlcNotFound
    ? 'Couldn\'t run VLC. Please make sure it\'s installed.'
    : ''
  return hx`
    <div>
      <p><strong>Sorry, we can't play that file.</strong></p>
      <p>${message}</p>
      <p class='float-right'>
        <button class="button-flat" onclick=${dispatcher('backToList')}>Cancel</button>
        ${actionButton}
      </p>
      <p class='error-text'>${vlcMessage}</p>
    </div>
  `

  function onInstall () {
    electron.shell.openExternal('http://www.videolan.org/vlc/')
    state.modal.vlcInstalled = true // Assume they'll install it successfully
  }

  function onPlay () {
    dispatch('vlcPlay')
  }
}
