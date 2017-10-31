const React = require('react')

const {dispatch, dispatcher} = require('../lib/dispatcher')
const PathSelector = require('./path-selector')
const ModalOKCancel = require('./modal-ok-cancel')

module.exports = class OpenDownloadPathSelector extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      downloadPath: ''
    }
    this.handleDownloadPathChange = this.handleDownloadPathChange.bind(this)
  }
  render () {
    const {state} = this.props
    return (
      <div className='open-torrent-address-modal'>
        <p><label>Select a download location</label></p>
        <PathSelector
          dialog={{
            title: 'Select download directory',
            properties: [ 'openDirectory' ]
          }}
          onChange={this.handleDownloadPathChange}
          title='Download location'
          textareaStyle={{
            color: '#000'
          }}
          value={this.state.downloadPath || state.saved.prefs.downloadPath}
        />
        <ModalOKCancel
          cancelText='CANCEL'
          onCancel={dispatcher('exitModal')}
          okText='START'
          onOK={this.handleOK.bind(this)} />
      </div>
    )
  }
  handleOK () {
    dispatcher('exitModal')
    this.props.state.modal.exitCallBack()
  }
  handleDownloadPathChange (filePath) {
    this.setState({downloadPath: filePath}, () => {
      if (!this.props.state.modal.updateOnlyTorrent) { dispatch('updatePreferences', 'downloadPath', filePath) } else {
        dispatch('updateTorrentLocation', filePath, this.props.state.modal.infoHash)
      }
    })
  }
}
