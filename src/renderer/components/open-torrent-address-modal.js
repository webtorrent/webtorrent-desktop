const React = require('react')
const TextField = require('material-ui/TextField').default
const { clipboard } = require('electron')

const ModalOKCancel = require('./modal-ok-cancel')
const { dispatch, dispatcher } = require('../lib/dispatcher')
const { isMagnetLink } = require('../lib/torrent-player')

module.exports = class OpenTorrentAddressModal extends React.Component {
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
