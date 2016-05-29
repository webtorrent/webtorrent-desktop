module.exports = OpenTorrentAddressModal

var {dispatch} = require('../lib/dispatcher')
var hx = require('../lib/hx')

function OpenTorrentAddressModal (state) {
  return hx`
    <div class='open-torrent-address-modal'>
      <p><label>Enter torrent address or magnet link</label></p>
      <p>
        <input id='add-torrent-url' type='text' onkeypress=${handleKeyPress} />
      </p>
      <p class='float-right'>
        <button class='button button-flat' onclick=${handleCancel}>CANCEL</button>
          <button class='button button-raised' onclick=${handleOK}>OK</button>
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
