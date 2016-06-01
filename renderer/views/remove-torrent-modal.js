module.exports = RemoveTorrentModal

var {dispatch, dispatcher} = require('../lib/dispatcher')
var hx = require('../lib/hx')

function RemoveTorrentModal (state) {
  var message = state.modal.deleteData
    ? 'Are you sure you want to remove this torrent from the list and delete the data file?'
    : 'Are you sure you want to remove this torrent from the list?'
  var buttonText = state.modal.deleteData ? 'Remove Data' : 'Remove'

  return hx`
    <div>
      <p><strong>${message}</strong></p>
      <p class='float-right'>
        <button class='button button-flat' onclick=${dispatcher('exitModal')}>Cancel</button>
        <button class='button button-raised' onclick=${handleRemove}>${buttonText}</button>
      </p>
    </div>
  `

  function handleRemove () {
    dispatch('deleteTorrent', state.modal.infoHash, state.modal.deleteData)
    dispatch('exitModal')
  }
}
