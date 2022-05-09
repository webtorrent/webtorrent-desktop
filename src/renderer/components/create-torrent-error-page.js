import * as React from 'react'
import { dispatcher } from '../lib/dispatcher.js'

export default class CreateTorrentErrorPage extends React.Component {
  render () {
    return (
      <div className='create-torrent'>
        <h2>Create torrent</h2>
        <p className='torrent-info'>
          <p>
            Sorry, you must select at least one file that is not a hidden file.
          </p>
          <p>
            Hidden files, starting with a . character, are not included.
          </p>
        </p>
        <p className='float-right'>
          <button className='button-flat light' onClick={dispatcher('cancel')}>
            Cancel
          </button>
        </p>
      </div>
    )
  }
}
