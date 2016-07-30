const React = require('react')

const {dispatch, dispatcher} = require('../lib/dispatcher')

module.exports = class OpenTorrentAddressModal extends React.Component {
  render () {
    // TODO: dcposch remove janky inline <script>
    return (
      <div className='open-torrent-address-modal'>
        <p><label>Enter torrent address or magnet link</label></p>
        <p>
          <input id='add-torrent-url' type='text' onKeyPress={handleKeyPress} />
        </p>
        <p className='float-right'>
          <button className='button button-flat' onClick={dispatcher('exitModal')}>Cancel</button>
          <button className='button button-raised' onClick={handleOK}>OK</button>
        </p>
        <script>document.querySelector('#add-torrent-url').focus()</script>
      </div>
    )
  }
}

function handleKeyPress (e) {
  if (e.which === 13) handleOK() /* hit Enter to submit */
}

function handleOK () {
  dispatch('exitModal')
  // TODO: dcposch use React refs instead
  dispatch('addTorrent', document.querySelector('#add-torrent-url').value)
}
