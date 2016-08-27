const React = require('react')
const {FormattedMessage} = require('react-intl')

const {dispatcher} = require('../lib/dispatcher')

module.exports = class CreateTorrentErrorPage extends React.Component {
  render () {
    return (
      <div className='create-torrent'>
        <h2><FormattedMessage id='torrrent-error-title'
          defaultMessage='Create torrent' /></h2>
        <p className='torrent-info'>
          <p>
            <FormattedMessage id='torrrent-error-missing-file'
              defaultMessage='Sorry, you must select at least one file that is not a hidden file.' />
          </p>
          <p>
            <FormattedMessage id='torrrent-error-desc'
              defaultMessage='Hidden files, starting with a . character, are not included.' />
          </p>
        </p>
        <p className='float-right'>
          <button className='button-flat light' onClick={dispatcher('cancel')}>
            <FormattedMessage id='cancel'
              defaultMessage='Cancel' />
          </button>
        </p>
      </div>
    )
  }
}
