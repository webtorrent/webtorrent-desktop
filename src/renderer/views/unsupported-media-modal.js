module.exports = UnsupportedMediaModal

const React = require('react')
const electron = require('electron')

const {dispatch, dispatcher} = require('../lib/dispatcher')

function UnsupportedMediaModal (state) {
  var err = state.modal.error
  var message = (err && err.getMessage)
    ? err.getMessage()
    : err
  var actionButton = state.modal.vlcInstalled
    ? (<button className='button-raised' onClick={onPlay}>Play in VLC</button>)
    : (<button className='button-raised' onClick={onInstall}>Install VLC</button>)
  var vlcMessage = state.modal.vlcNotFound
    ? 'Couldn\'t run VLC. Please make sure it\'s installed.'
    : ''
  return (
    <div>
      <p><strong>Sorry, we can't play that file.</strong></p>
      <p>{message}</p>
      <p className='float-right'>
        <button className='button-flat' onClick={dispatcher('backToList')}>Cancel</button>
        {actionButton}
      </p>
      <p className='error-text'>{vlcMessage}</p>
    </div>
  )

  function onInstall () {
    electron.shell.openExternal('http://www.videolan.org/vlc/')
    state.modal.vlcInstalled = true // Assume they'll install it successfully
  }

  function onPlay () {
    dispatch('vlcPlay')
  }
}
