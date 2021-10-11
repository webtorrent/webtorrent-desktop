import * as React from 'react'
import { shell } from 'electron'
import ModalOKCancel from './modal-ok-cancel.js'
import { dispatch } from '../lib/dispatcher.js'

export default class UpdateAvailableModal extends React.Component {
  render () {
    const state = this.props.state
    return (
      <div className='update-available-modal'>
        <p><strong>A new version of WebTorrent is available: v{state.modal.version}</strong></p>
        <p>
          We have an auto-updater for Windows and Mac.
          We don't have one for Linux yet, so you'll have to download the new version manually.
        </p>
        <ModalOKCancel
          cancelText='SKIP THIS RELEASE'
          onCancel={handleSkip}
          okText='SHOW DOWNLOAD PAGE'
          onOK={handleShow}
        />
      </div>
    )

    function handleShow () {
      // TODO: use the GitHub urls from config.js
      shell.openExternal('https://github.com/webtorrent/webtorrent-desktop/releases')
      dispatch('exitModal')
    }

    function handleSkip () {
      dispatch('skipVersion', state.modal.version)
      dispatch('exitModal')
    }
  }
}
