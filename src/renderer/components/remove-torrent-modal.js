const React = require('react')
const {FormattedMessage} = require('react-intl')

const {dispatch, dispatcher} = require('../lib/dispatcher')

module.exports = class RemoveTorrentModal extends React.Component {
  render () {
    var state = this.props.state
    var message = state.modal.deleteData
      ? (<FormattedMessage id='torrent-remove-data-confirm'
        defaultMessage='Are you sure you want to remove this torrent from the list and delete the data file?'/>)
      : (<FormattedMessage id='torrent-remove-confirm'
        defaultMessage='Are you sure you want to remove this torrent from the list?'/>)
    var buttonText = state.modal.deleteData
      ? (<FormattedMessage id='torrent-remove-data-action'
        defaultMessage='Remove Data'/>)
      : (<FormattedMessage id='torrent-remove-action'
        defaultMessage='Remove'/>)

    return (
      <div>
        <p><strong>{message}</strong></p>
        <p className='float-right'>
          <button className='button button-flat' onClick={dispatcher('exitModal')}>
            <FormattedMessage id='cancel'
              defaultMessage='Cancel'/>
          </button>
          <button className='button button-raised' onClick={handleRemove}>{buttonText}</button>
        </p>
      </div>
    )

    function handleRemove () {
      dispatch('deleteTorrent', state.modal.infoHash, state.modal.deleteData)
      dispatch('exitModal')
    }
  }
}
