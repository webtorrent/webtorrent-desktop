const React = require('react')
const electron = require('electron')

const ModalOKCancel = require('./modal-ok-cancel')
const {dispatcher} = require('../lib/dispatcher')

module.exports = class UnsupportedMediaModal extends React.Component {
  render () {
    const state = this.props.state
    const err = state.modal.error
    const message = (err && err.getMessage)
      ? err.getMessage()
      : err
    const onAction = state.modal.externalPlayerInstalled
      ? dispatcher('openExternalPlayer')
      : () => this.onInstall()
    const actionText = state.modal.externalPlayerInstalled
      ? 'PLAY IN ' + state.getExternalPlayerName().toUpperCase()
      : 'INSTALL VLC'
    const errorMessage = state.modal.externalPlayerNotFound
      ? 'Couldn\'t run external player. Please make sure it\'s installed.'
      : ''
    return (
      <div>
        <p><strong>Sorry, we can't play that file.</strong></p>
        <p>{message}</p>
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('backToList')}
          okText={actionText}
          onOK={onAction} />
        <p className='error-text'>{errorMessage}</p>
      </div>
    )
  }

  onInstall () {
    electron.shell.openExternal('http://www.videolan.org/vlc/')

    // TODO: dcposch send a dispatch rather than modifying state directly
    const state = this.props.state
    state.modal.externalPlayerInstalled = true // Assume they'll install it successfully
  }
}
