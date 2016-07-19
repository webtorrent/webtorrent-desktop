module.exports = RemoveTorrentModal

const React = require('react')

const {dispatch, dispatcher} = require('../lib/dispatcher')

function RemoveTorrentModal (state) {
  var message = state.modal.deleteData
    ? 'Are you sure you want to remove this torrent from the list and delete the data file?'
    : 'Are you sure you want to remove this torrent from the list?'
  var buttonText = state.modal.deleteData ? 'Remove Data' : 'Remove'

  return (
    <div>
      <p><strong>{message}</strong></p>
      <p className='float-right'>
        <button className='button button-flat' onClick={dispatcher('exitModal')}>Cancel</button>
        <button className='button button-raised' onClick={handleRemove}>{buttonText}</button>
      </p>
    </div>
  )

  function handleRemove () {
    dispatch('deleteTorrent', state.modal.infoHash, state.modal.deleteData)
    dispatch('exitModal')
  }
}
