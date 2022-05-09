import * as React from 'react'
import textField from 'material-ui/TextField'
import electron from 'electron'
import ModalOKCancel from './modal-ok-cancel.js'
import { dispatch, dispatcher } from '../lib/dispatcher.js'
import { isMagnetLink } from '../lib/torrent-player.js'

const TextField = textField.default
const { clipboard } = electron

export default class OpenTorrentAddressModal extends React.Component {
  render () {
    return (
      <div className='open-torrent-address-modal'>
        <p><label>Enter torrent address or magnet link</label></p>
        <div>
          <TextField
            id='torrent-address-field'
            className='control'
            ref={(c) => { this.torrentURL = c }}
            fullWidth
            onKeyDown={handleKeyDown.bind(this)}
          />
        </div>
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('exitModal')}
          okText='OK'
          onOK={handleOK.bind(this)}
        />
      </div>
    )
  }

  componentDidMount () {
    this.torrentURL.input.focus()
    const clipboardContent = clipboard.readText()

    if (isMagnetLink(clipboardContent)) {
      this.torrentURL.input.value = clipboardContent
      this.torrentURL.input.select()
    }
  }
}

function handleKeyDown (e) {
  if (e.which === 13) handleOK.call(this) /* hit Enter to submit */
}

function handleOK () {
  dispatch('exitModal')
  dispatch('addTorrent', this.torrentURL.input.value)
}
