const React = require('react')

const ModalOKCancel = require('./modal-ok-cancel')
const { dispatch, dispatcher } = require('../lib/dispatcher')

module.exports = class ClearTorrentModal extends React.Component {
  render () {
    const message = 'Are you sure you want to clear all completed torrents from the list?'
    const buttonText = 'CLEAR'

    return (
      <div>
        <p><strong>{message}</strong></p>
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('exitModal')}
          okText={buttonText}
          onOK={handleRemove}
        />
      </div>
    )

    function handleRemove () {
      dispatch('clearCompletedTorrents')
      dispatch('exitModal')
    }
  }
}
