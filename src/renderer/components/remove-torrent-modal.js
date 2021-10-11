import * as React from 'react'
import ModalOKCancel from './modal-ok-cancel.js'
import { dispatch, dispatcher } from '../lib/dispatcher.js'

export default class RemoveTorrentModal extends React.Component {
  render () {
    const state = this.props.state
    const message = state.modal.deleteData
      ? 'Are you sure you want to remove this torrent from the list and delete the data file?'
      : 'Are you sure you want to remove this torrent from the list?'
    const buttonText = state.modal.deleteData ? 'REMOVE DATA' : 'REMOVE'

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
      dispatch('deleteTorrent', state.modal.infoHash, state.modal.deleteData)
      dispatch('exitModal')
    }
  }
}
