const React = require('react')
const electron = require('electron')

const ModalOKCancel = require('./modal-ok-cancel')
const { dispatch } = require('../lib/dispatcher')

module.exports = class SharePlaylistModal extends React.Component {
  render () {
    const state = this.props.state
    return (
      <div className='share-playlist-modal'>
        <p><strong>Copy this content and share your playlist with your friends! Share it just doing paste wherever you want{state.modal.version}</strong></p>
        <textarea readOnly value={JSON.stringify(state.saved.playlistSelected)}></textarea>
        <ModalOKCancel
          cancelText='Close'
          onCancel={handleSkip}
          okText='Copy to clipboard'
          onOK={handleShow} />
      </div>
    )

    function handleShow () {
      electron.clipboard.writeText(JSON.stringify(state.saved.playlistSelected))
    }

    function handleSkip () {
      dispatch('skipVersion', state.modal.version)
      dispatch('exitModal')
    }
  }
}
