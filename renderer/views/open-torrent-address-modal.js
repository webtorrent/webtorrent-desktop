module.exports = OpenTorrentAddressModal

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var {dispatch} = require('../lib/dispatcher')

function OpenTorrentAddressModal (state) {
  return hx`
    <div class='open-torrent-address-modal'>
      <p><strong>Enter torrent address or magnet link</strong></p>
      <p>
        <input id='add-torrent-url' type='text' onkeypress=${handleKeyPress} />
        <button class='primary' onclick=${handleOK}>OK</button>
        <button class='cancel' onclick=${handleCancel}>Cancel</button>
      </p>
      <script>document.querySelector('#add-torrent-url').focus()</script>
    </div>
  `
}

function handleKeyPress (e) {
  if (e.which === 13) handleOK() /* hit Enter to submit */
}

function handleOK () {
  dispatch('exitModal')
  dispatch('addTorrent', document.querySelector('#add-torrent-url').value)
}

function handleCancel () {
  dispatch('exitModal')
}
