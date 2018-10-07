const React = require('react')

const ModalOKCancel = require('./modal-ok-cancel')
const { dispatch, dispatcher } = require('../lib/dispatcher')

module.exports = class DeleteAllTorrentsModal extends React.Component {
  render () {
    const { state: { modal: { deleteData } } } = this.props
    const message = deleteData
      ? 'Are you sure you want to remove all the torrents from the list and delete the data files?'
      : 'Are you sure you want to remove all the torrents from the list?'
    const buttonText = deleteData ? 'REMOVE DATA' : 'REMOVE'

    return (
      <div>
        <p><strong>{message}</strong></p>
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('exitModal')}
          okText={buttonText}
          onOK={handleRemove} />
      </div>
    )

    function handleRemove () {
      dispatch('deleteAllTorrents', deleteData)
      dispatch('exitModal')
    }
  }
}
