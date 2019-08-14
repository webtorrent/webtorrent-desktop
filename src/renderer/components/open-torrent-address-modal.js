const React = require('react')
const TextField = require('material-ui/TextField').default

const ModalOKCancel = require('./modal-ok-cancel')
const { dispatch, dispatcher } = require('../lib/dispatcher')

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
  }
}

function handleKeyDown (e) {
  if (e.which === 13) handleOK.call(this) /* hit Enter to submit */
}

function handleOK () {
  dispatch('exitModal')
  dispatch('addTorrent', this.torrentURL.input.value)
}
