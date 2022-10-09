const React = require('react')
const PropTypes = require('prop-types')

const Button = require('@material-ui/core/Button').default
const Checkbox = require('@material-ui/core/Checkbox').default
const FormControlLabel = require('@material-ui/core/FormControlLabel').default
const TextField = require('@material-ui/core/TextField').default
const grey = require('@material-ui/core/colors/grey').default

const Heading = require('../components/heading')
const PathSelector = require('../components/path-selector')

const { dispatch } = require('../lib/dispatcher')
const config = require('../../config')

class PreferencesPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleDownloadPathChange =
      this.handleDownloadPathChange.bind(this)

    this.handleOpenExternalPlayerChange =
      this.handleOpenExternalPlayerChange.bind(this)

    this.handleExternalPlayerPathChange =
      this.handleExternalPlayerPathChange.bind(this)

    this.handleStartupChange =
      this.handleStartupChange.bind(this)

    this.handleSoundNotificationsChange =
      this.handleSoundNotificationsChange.bind(this)

    this.handleSetGlobalTrackers =
      this.handleSetGlobalTrackers.bind(this)

    const globalTrackers = this.props.state.getGlobalTrackers().join('\n')

    this.state = {
      globalTrackers
    }
  }

  downloadPathSelector () {
    return (
      <Preference>
        <PathSelector
          dialog={{
            title: 'Select download directory',
            properties: ['openDirectory']
          }}
          onChange={this.handleDownloadPathChange}
          title='Download location'
          value={this.props.state.saved.prefs.downloadPath}
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
        <FormControlLabel
          control={
            <Checkbox
              className='control'
              checked={!this.props.state.saved.prefs.openExternalPlayer}
              onChange={this.handleOpenExternalPlayerChange}
            />
          }
          label='Play torrent media files using WebTorrent'
        />
      </Preference>
    )
  }

  handleOpenExternalPlayerChange (e, isChecked) {
    dispatch('updatePreferences', 'openExternalPlayer', !isChecked)
  }

  highestPlaybackPriorityCheckbox () {
    return (
      <Preference>
        <FormControlLabel
          control={
            <Checkbox
              className='control'
              checked={this.props.state.saved.prefs.highestPlaybackPriority}
              onChange={this.handleHighestPlaybackPriorityChange}
            />
          }
          label='Highest Playback Priority'
        />
        <p>Pauses all active torrents to allow playback to use all of the available bandwidth.</p>
      </Preference>
    )
  }

  handleHighestPlaybackPriorityChange (e, isChecked) {
    dispatch('updatePreferences', 'highestPlaybackPriority', isChecked)
  }

  externalPlayerPathSelector () {
    const playerPath = this.props.state.saved.prefs.externalPlayerPath
    const playerName = this.props.state.getExternalPlayerName()

    const description = this.props.state.saved.prefs.openExternalPlayer
      ? `Torrent media files will always play in ${playerName}.`
      : `Torrent media files will play in ${playerName} if WebTorrent cannot play them.`

    return (
      <Preference>
        <p>{description}</p>
        <PathSelector
          dialog={{
            title: 'Select media player app',
            properties: ['openFile']
          }}
          onChange={this.handleExternalPlayerPathChange}
          title='External player'
          value={playerPath}
        />
      </Preference>
    )
  }

  handleExternalPlayerPathChange (filePath) {
    dispatch('updatePreferences', 'externalPlayerPath', filePath)
  }

  autoAddTorrentsCheckbox () {
    return (
      <Preference>
        <FormControlLabel
          control={
            <Checkbox
              className='control'
              checked={this.props.state.saved.prefs.autoAddTorrents}
              onChange={(e, value) => { this.handleAutoAddTorrentsChange(e, value) }}
            />
          }
          label='Watch for new .torrent files and add them immediately'
        />
      </Preference>
    )
  }

  handleAutoAddTorrentsChange (e, isChecked) {
    const torrentsFolderPath = this.props.state.saved.prefs.torrentsFolderPath
    if (isChecked && !torrentsFolderPath) {
      alert('Select a torrents folder first.') // eslint-disable-line
      e.preventDefault()
      return
    }

    dispatch('updatePreferences', 'autoAddTorrents', isChecked)

    if (isChecked) {
      dispatch('startFolderWatcher')
      return
    }

    dispatch('stopFolderWatcher')
  }

  torrentsFolderPathSelector () {
    const torrentsFolderPath = this.props.state.saved.prefs.torrentsFolderPath

    return (
      <Preference>
        <PathSelector
          dialog={{
            title: 'Select folder to watch for new torrents',
            properties: ['openDirectory']
          }}
          onChange={this.handleTorrentsFolderPathChange}
          title='Folder to watch'
          value={torrentsFolderPath}
        />
      </Preference>
    )
  }

  handleTorrentsFolderPathChange (filePath) {
    dispatch('updatePreferences', 'torrentsFolderPath', filePath)
  }

  setDefaultAppButton () {
    const isFileHandler = this.props.state.saved.prefs.isFileHandler
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
        <Button
          className='control'
          onClick={this.handleSetDefaultApp}
          variant='contained'
        >
          Make WebTorrent the default
        </Button>
      </Preference>
    )
  }

  handleStartupChange (e, isChecked) {
    dispatch('updatePreferences', 'startup', isChecked)
  }

  setStartupCheckbox () {
    if (config.IS_PORTABLE) {
      return
    }

    return (
      <Preference>
        <FormControlLabel
          control={
            <Checkbox
              className='control'
              checked={this.props.state.saved.prefs.startup}
              onChange={this.handleStartupChange}
            />
          }
          label='Open WebTorrent on startup'
        />
      </Preference>
    )
  }

  soundNotificationsCheckbox () {
    return (
      <Preference>
        <FormControlLabel
          control={
            <Checkbox
              className='control'
              checked={this.props.state.saved.prefs.soundNotifications}
              onChange={this.handleSoundNotificationsChange}
            />
          }
          label='Enable sounds'
        />
      </Preference>
    )
  }

  handleSoundNotificationsChange (e, isChecked) {
    dispatch('updatePreferences', 'soundNotifications', isChecked)
  }

  handleSetDefaultApp () {
    dispatch('updatePreferences', 'isFileHandler', true)
  }

  setGlobalTrackers () {
    return (
      <Preference>
        <TextField
          className='torrent-trackers control'
          fullWidth
          maxRows={10}
          minRows={2}
          multiline
          onChange={this.handleSetGlobalTrackers}
          value={this.state.globalTrackers}
        />
      </Preference>
    )
  }

  handleSetGlobalTrackers (e, globalTrackers) {
    this.setState({ globalTrackers })

    const announceList = globalTrackers
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s !== '')

    dispatch('updatePreferences', 'globalTrackers', announceList)
    dispatch('updateGlobalTrackers', announceList)
  }

  render () {
    const style = {
      color: grey['400'],
      marginLeft: 25,
      marginRight: 25
    }
    return (
      <div style={style}>
        <PreferencesSection title='Folders'>
          {this.downloadPathSelector()}
          {this.autoAddTorrentsCheckbox()}
          {this.torrentsFolderPathSelector()}
        </PreferencesSection>
        <PreferencesSection title='Playback'>
          {this.openExternalPlayerCheckbox()}
          {this.externalPlayerPathSelector()}
          {this.highestPlaybackPriorityCheckbox()}
        </PreferencesSection>
        <PreferencesSection title='Default torrent app'>
          {this.setDefaultAppButton()}
        </PreferencesSection>
        <PreferencesSection title='General'>
          {this.setStartupCheckbox()}
          {this.soundNotificationsCheckbox()}
        </PreferencesSection>
        <PreferencesSection title='Trackers'>
          {this.setGlobalTrackers()}
        </PreferencesSection>
      </div>
    )
  }
}

class PreferencesSection extends React.Component {
  static get propTypes () {
    return {
      title: PropTypes.string
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
