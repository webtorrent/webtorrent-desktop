const React = require('react')
const electron = require('electron')
const {FormattedMessage} = require('react-intl')

const {dispatch} = require('../lib/dispatcher')

module.exports = class UpdateAvailableModal extends React.Component {
  render () {
    var state = this.props.state
    var msg = 'We have an auto-updater for Windows and Mac. We don\'t have one for Linux yet, so you\'ll have to download the new version manually.'
    return (
      <div className='update-available-modal'>
        <p><strong><FormattedMessage id='update-available'
              defaultMessage='A new version of WebTorrent is available: v{version}'
              values={{version: state.modal.version}}/></strong></p>
        <p>
          <FormattedMessage id='update-available-desc'
            defaultMessage={msg} />
        </p>
        <p className='float-right'>
          <button className='button button-flat' onClick={handleSkip}>
            <FormattedMessage id='update-available-skip'
              defaultMessage='Skip This Release'/></button>
          <button className='button button-raised' onClick={handleShow}>
            <FormattedMessage id='update-available-download'
              defaultMessage='Show Download Page'/>
          </button>
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
