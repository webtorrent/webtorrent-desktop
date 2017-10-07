const path = require('path')
const React = require('react')

const colors = require('material-ui/styles/colors')
const Checkbox = require('material-ui/Checkbox').default
const RaisedButton = require('material-ui/RaisedButton').default
const Heading = require('../components/heading')
const PathSelector = require('../components/path-selector')

const {dispatch} = require('../lib/dispatcher')
const config = require('../../config')

class PreferencesPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleDownloadPathChange =
      this.handleDownloadPathChange.bind(this)

    this.handleActiveTorrentsLimitChange =
      this.handleActiveTorrentsLimitChange.bind(this)

    this.handleOpenExternalPlayerChange =
      this.handleOpenExternalPlayerChange.bind(this)

    this.handleExternalPlayerPathChange =
      this.handleExternalPlayerPathChange.bind(this)

    this.handleStartupChange =
      this.handleStartupChange.bind(this)
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
          value={this.props.state.unsaved.prefs.downloadPath} />
      </Preference>
    )
  }

  handleDownloadPathChange (filePath) {
    dispatch('updatePreferences', 'downloadPath', filePath)
  }

  activeTorrentsLimitCheckbox () {
    return (
      <Preference>
        <Checkbox
          className='control'
          checked={this.props.state.unsaved.prefs.activeTorrentsLimit !== 0}
          label={'Limit the number of active torrents'}
          onCheck={this.handleActiveTorrentsLimitChange} />
      </Preference>
    )
  }

  handleActiveTorrentsLimitChange (e, isChecked) {
    dispatch('updatePreferences', 'activeTorrentsLimit', isChecked ? 1 : 0)
  }

  openExternalPlayerCheckbox () {
    return (
      <Preference>
        <Checkbox
          className='control'
          checked={!this.props.state.unsaved.prefs.openExternalPlayer}
          label={'Play torrent media files using WebTorrent'}
          onCheck={this.handleOpenExternalPlayerChange} />
      </Preference>
    )
  }

  handleOpenExternalPlayerChange (e, isChecked) {
    dispatch('updatePreferences', 'openExternalPlayer', !isChecked)
  }

  highestPlaybackPriorityCheckbox () {
    return (
      <Preference>
        <Checkbox
          className='control'
          checked={this.props.state.unsaved.prefs.highestPlaybackPriority}
          label={'Highest Playback Priority'}
          onCheck={this.handleHighestPlaybackPriorityChange}
        />
        <p>Pauses all active torrents to allow playback to use all of the available bandwidth.</p>
      </Preference>
    )
  }

  handleHighestPlaybackPriorityChange (e, isChecked) {
    dispatch('updatePreferences', 'highestPlaybackPriority', isChecked)
  }

  externalPlayerPathSelector () {
    const playerPath = this.props.state.unsaved.prefs.externalPlayerPath
    const playerName = this.props.state.getExternalPlayerName()

    const description = this.props.state.unsaved.prefs.openExternalPlayer
      ? `Torrent media files will always play in ${playerName}.`
      : `Torrent media files will play in ${playerName} if WebTorrent cannot play them.`

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
          value={playerPath ? path.dirname(playerPath) : null} />
      </Preference>
    )
  }

  handleExternalPlayerPathChange (filePath) {
    dispatch('updatePreferences', 'externalPlayerPath', filePath)
  }

  setDefaultAppButton () {
    const isFileHandler = this.props.state.unsaved.prefs.isFileHandler
    if (isFileHandler) {
      return (
        <Preference>
          <p>WebTorrent is your default torrent app. Hooray!</p>
        </Preference>
      )
    }
    return (
      <Preference>
        <p>WebTorrent is not currently the default torrent app.</p>
        <RaisedButton
          className='control'
          onClick={this.handleSetDefaultApp}
          label='Make WebTorrent the default' />
      </Preference>
    )
  }

  handleStartupChange (e, isChecked) {
    dispatch('updatePreferences', 'startup', isChecked)
  }

  setStartupSection () {
    if (config.IS_PORTABLE) {
      return
    }

    return (
      <PreferencesSection title='Startup'>
        <Preference>
          <Checkbox
            className='control'
            checked={this.props.state.unsaved.prefs.startup}
            label={'Open WebTorrent on startup.'}
            onCheck={this.handleStartupChange}
          />
        </Preference>
      </PreferencesSection>
    )
  }

  handleSetDefaultApp () {
    dispatch('updatePreferences', 'isFileHandler', true)
  }

  render () {
    const style = {
      color: colors.grey400,
      marginLeft: 25,
      marginRight: 25
    }
    return (
      <div style={style}>
        <PreferencesSection title='Downloads'>
          {this.downloadPathSelector()}
          {this.activeTorrentsLimitCheckbox()}
        </PreferencesSection>
        <PreferencesSection title='Playback'>
          {this.openExternalPlayerCheckbox()}
          {this.externalPlayerPathSelector()}
          {this.highestPlaybackPriorityCheckbox()}
        </PreferencesSection>
        <PreferencesSection title='Default torrent app'>
          {this.setDefaultAppButton()}
        </PreferencesSection>
        {this.setStartupSection()}
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
    const style = {
      marginBottom: 25,
      marginTop: 25
    }
    return (
      <div style={style}>
        <Heading level={2}>{this.props.title}</Heading>
        {this.props.children}
      </div>
    )
  }
}

class Preference extends React.Component {
  render () {
    const style = { marginBottom: 10 }
    return (<div style={style}>{this.props.children}</div>)
  }
}

module.exports = PreferencesPage
