const React = require('react')

const ModalOKCancel = require('./modal-ok-cancel')
const { dispatch, dispatcher } = require('../lib/dispatcher')

module.exports = class RemoveTorrentModal extends React.Component {
  render () {
    const state = this.props.state

    return (
      <div>
        <p>
          <strong>
            Are you sure you want to remove this torrent from the list and delete the data file?
          </strong>
        </p>
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('exitModal')}
          okText='REMOVE DATA'
          onOK={handleRemove}
        />
      </div>
    )

    function handleRemove () {
      dispatch('deleteTorrent', state.modal.infoHash, true)
      dispatch('exitModal')
    }
  }
}
