const React = require('react')
const path = require('path')

const Checkbox = require('material-ui/Checkbox').default
const colors = require('material-ui/styles/colors')
const RaisedButton = require('material-ui/RaisedButton').default

const PathSelector = require('./PathSelector')
const {dispatch} = require('../lib/dispatcher')

class PreferencesPage extends React.Component {
  constructor () {
    super()

    this.handleDownloadPathChange =
      this.handleDownloadPathChange.bind(this)

    this.handleOpenExternalPlayerChange =
      this.handleOpenExternalPlayerChange.bind(this)

    this.handleExternalPlayerPathChange =
      this.handleExternalPlayerPathChange.bind(this)
  }

  downloadPathSelector () {
    return (
      <Preference>
        <PathSelector
          dialog={{
            title: 'Select download directory',
            properties: [ 'openDirectory' ]
          }}
          onChange={this.handleDownloadPathChange}
          title='Download location'
          value={this.props.state.unsaved.prefs.downloadPath}
        />
      </Preference>
    )
  }

  handleDownloadPathChange (filePath) {
    dispatch('updatePreferences', 'downloadPath', filePath)
  }

  openExternalPlayerCheckbox () {
    return (
      <Preference>
        <Checkbox
          className='control'
          checked={!this.props.state.unsaved.prefs.openExternalPlayer}
          label={'Play torrent media files using WebTorrent'}
          onCheck={this.handleOpenExternalPlayerChange}
        />
      </Preference>
    )
  }

  handleOpenExternalPlayerChange (e, isChecked) {
    dispatch('updatePreferences', 'openExternalPlayer', !isChecked)
  }

  externalPlayerPathSelector () {
    const playerName = path.basename(
      this.props.state.unsaved.prefs.externalPlayerPath || 'VLC'
    )

    const description = this.props.state.unsaved.prefs.openExternalPlayer
      ? `Torrent media files will always play in ${playerName}.`
      : `Torrent media files will play in ${playerName} if WebTorrent cannot ` +
        'play them.'

    return (
      <Preference>
        <p>{description}</p>
        <PathSelector
          dialog={{
            title: 'Select media player app',
            properties: [ 'openFile' ]
          }}
          displayValue={playerName}
          onChange={this.handleExternalPlayerPathChange}
          title='External player'
          value={this.props.state.unsaved.prefs.externalPlayerPath}
        />
      </Preference>
    )
  }

  handleExternalPlayerPathChange (filePath) {
    if (path.extname(filePath) === '.app') {
      // Mac: Use executable in packaged .app bundle
      filePath += '/Contents/MacOS/' + path.basename(filePath, '.app')
    }
    dispatch('updatePreferences', 'externalPlayerPath', filePath)
  }

  setDefaultAppButton () {
    return (
      <Preference>
        <p>WebTorrent is not currently the default torrent app.</p>
        <RaisedButton
          className='control'
          onClick={this.handleSetDefaultApp}
          label='Make WebTorrent the default'
        />
      </Preference>
    )
  }

  handleSetDefaultApp () {
    window.alert('TODO')
    // var isFileHandler = state.unsaved.prefs.isFileHandler
    // dispatch('updatePreferences', 'isFileHandler', !isFileHandler)
  }

  render () {
    return (
      <div
        style={{
          color: colors.grey400,
          marginLeft: 20,
          marginRight: 20
        }}
      >
        <PreferencesSection title='Downloads'>
          {this.downloadPathSelector()}
        </PreferencesSection>
        <PreferencesSection title='Playback'>
          {this.openExternalPlayerCheckbox()}
          {this.externalPlayerPathSelector()}
        </PreferencesSection>
        <PreferencesSection title='Default torrent app'>
          {this.setDefaultAppButton()}
        </PreferencesSection>
      </div>
    )
  }
}

class PreferencesSection extends React.Component {
  static get propTypes () {
    return {
      title: React.PropTypes.string
    }
  }

  render () {
    return (
      <div
        style={{
          marginBottom: 30,
          marginTop: 30
        }}
      >
        <h2
          style={{
            color: colors.grey50,
            fontSize: 22
          }}
        >{this.props.title}</h2>
        {this.props.children}
      </div>
    )
  }
}

class Preference extends React.Component {
  render () {
    return (
      <div
        style={{
          marginBottom: 10
        }}
      >
        {this.props.children}
      </div>
    )
  }
}

module.exports = PreferencesPage
