const React = require('react')
const electron = require('electron')

const {dispatch} = require('../lib/dispatcher')

module.exports = class UpdateAvailableModal extends React.Component {
  render () {
    var state = this.props.state
    return (
      <div className='update-available-modal'>
        <p><strong>A new version of WebTorrent is available: v{state.modal.version}</strong></p>
        <p>We have an auto-updater for Windows and Mac. We don't have one for Linux yet, so you'll have to download the new version manually.</p>
        <p className='float-right'>
          <button className='button button-flat' onClick={handleSkip}>Skip This Release</button>
          <button className='button button-raised' onClick={handleShow}>Show Download Page</button>
        </p>
      </div>
    )

    function handleShow () {
      electron.shell.openExternal('https://github.com/feross/webtorrent-desktop/releases')
      dispatch('exitModal')
    }

    function handleSkip () {
      dispatch('skipVersion', state.modal.version)
      dispatch('exitModal')
    }
  }
}
