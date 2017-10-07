const React = require('react')

const ModalOKCancel = require('./modal-ok-cancel')
const {dispatch, dispatcher} = require('../lib/dispatcher')

module.exports = class RemoveTorrentModal extends React.Component {
  render () {
    const state = this.props.state
    const message = 'Are you sure you want to remove all completed torrents from the list?'
    const buttonText = 'REMOVE COMPLETED'

    return (
      <div>
        <p><strong>{message}</strong></p>
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('exitModal')}
          okText={buttonText}
          onOK={handleRemove} />
      </div>
    )

    function handleRemove () {
      dispatch('removeCompletedTorrents')
      dispatch('exitModal')
    }
  }
}
