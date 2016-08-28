const React = require('react')
const {FormattedMessage} = require('react-intl')
const electron = require('electron')
const path = require('path')

const {dispatcher} = require('../lib/dispatcher')

module.exports = class UnsupportedMediaModal extends React.Component {
  render () {
    var state = this.props.state
    var err = state.modal.error
    var message = (err && err.getMessage)
      ? err.getMessage()
      : err
    var playerPath = state.saved.prefs.externalPlayerPath
    var playerName = playerPath
      ? path.basename(playerPath).split('.')[0]
      : 'VLC'
    var actionButton = state.modal.externalPlayerInstalled
      ? (<button className='button-raised' onClick={dispatcher('openExternalPlayer')}>
        <FormattedMessage id='media-unsupported-play-in'
          defaultMessage='Play in {playerName}'
          values={{
            playerName: playerName
          }}/>
      </button>)
      : (<button className='button-raised' onClick={() => this.onInstall}>
        <FormattedMessage id='media-unsupported-install-vlc'
          defaultMessage='Install VLC'/>
      </button>)
    var msg = 'Couldn\'t run external player. Please make sure it\'s installed.'
    var playerMessage = state.modal.externalPlayerNotFound
      ? (<FormattedMessage id='media-unsupported-player-not-found'
        defaultMessage={msg} />)
      : ''
    msg = 'Sorry, we can\'t play that file.'
    return (
      <div>
        <p><strong><FormattedMessage id='media-unsupported'
          defaultMessage={msg}/></strong></p>
        <p>{message}</p>
        <p className='float-right'>
          <button className='button-flat' onClick={dispatcher('backToList')}>
            <FormattedMessage id='cancel'
              defaultMessage='Cancel'/>
          </button>
          {actionButton}
        </p>
        <p className='error-text'>{playerMessage}</p>
      </div>
    )
  }

  onInstall () {
    electron.shell.openExternal('http://www.videolan.org/vlc/')

    // TODO: dcposch send a dispatch rather than modifying state directly
    var state = this.props.state
    state.modal.externalPlayerInstalled = true // Assume they'll install it successfully
  }
}
