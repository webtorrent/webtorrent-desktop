const React = require('react')
const PropTypes = require('prop-types')

const colors = require('material-ui/styles/colors')
const Checkbox = require('material-ui/Checkbox').default
const RaisedButton = require('material-ui/RaisedButton').default
const TextField = require('material-ui/TextField').default
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

    // Upload Speed limits
    this.handleUploadSpeedLimitToggle =
      this.handleUploadSpeedLimitToggle.bind(this)

    this.handleUploadSpeedLimitChange =
      this.handleUploadSpeedLimitChange.bind(this)

    // Download Speed limits
    this.handleDownloadSpeedLimitToggle =
      this.handleDownloadSpeedLimitToggle.bind(this)

    this.handleDownloadSpeedLimitChange =
      this.handleDownloadSpeedLimitChange.bind(this)

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
        <Checkbox
          className='control'
          checked={!this.props.state.saved.prefs.openExternalPlayer}
          label='Play torrent media files using WebTorrent'
          onCheck={this.handleOpenExternalPlayerChange}
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
        <Checkbox
          className='control'
          checked={this.props.state.saved.prefs.highestPlaybackPriority}
          label='Highest Playback Priority'
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
        <Checkbox
          className='control'
          checked={this.props.state.saved.prefs.autoAddTorrents}
          label='Watch for new .torrent files and add them immediately'
          onCheck={(e, value) => { this.handleAutoAddTorrentsChange(e, value) }}
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
        <RaisedButton
          className='control'
          onClick={this.handleSetDefaultApp}
          label='Make WebTorrent the default'
        />
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
        <Checkbox
          className='control'
          checked={this.props.state.saved.prefs.startup}
          label='Open WebTorrent on startup'
          onCheck={this.handleStartupChange}
        />
      </Preference>
    )
  }

  soundNotificationsCheckbox () {
    return (
      <Preference>
        <Checkbox
          className='control'
          checked={this.props.state.saved.prefs.soundNotifications}
          label='Enable sounds'
          onCheck={this.handleSoundNotificationsChange}
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
    // Align the text fields
    const textFieldStyle = { width: '100%' }
    const textareaStyle = { margin: 0 }

    return (
      <Preference>
        <TextField
          className='torrent-trackers control'
          style={textFieldStyle}
          textareaStyle={textareaStyle}
          multiLine
          rows={2}
          rowsMax={10}
          value={this.state.globalTrackers}
          onChange={this.handleSetGlobalTrackers}
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


  speedLimits () {
    const DLspeedLimitInKB = this.props.state.saved.prefs.downloadSpeedLimit / 1000;
    const ULspeedLimitInKB = this.props.state.saved.prefs.uploadSpeedLimit / 1000;


    // Align the text fields
    const textareaStyle = {
      margin: 0
      // marginTop: -40
    }
    const textFieldStyle = {
      width: '25%',
      marginTop: -12
    }
    const unitLabelStyle = {
      marginTop: -0.01,
      padding: 0.1,
      marginLeft: 4
    }

// webtorrent limits are in bytes, but our UI is in Kilobytes.
// So we do a conversions in this file.
    return (
      <Preference>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'inline-flex', alignItems: 'flex-start' }}>
          <Checkbox
            className='control'
            checked={this.props.state.saved.prefs.downloadSpeedLimitEnabled}
            label='Limit Download:'
            onCheck={this.handleDownloadSpeedLimitToggle}
          />
          <TextField
            className='control'
            style={textFieldStyle}
            textareaStyle={textareaStyle}
            rows={1}
            rowsMax={1}
            type='number'
            value={DLspeedLimitInKB}
            onChange={this.handleDownloadSpeedLimitChange}
            disabled={!this.props.state.saved.prefs.downloadSpeedLimitEnabled}
          />
          <p style={unitLabelStyle}>KB/s</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'flex-start' }}>
          <Checkbox
            className='control'
            checked={this.props.state.saved.prefs.uploadSpeedLimitEnabled}
            label='Limit Upload:'
            onCheck={this.handleUploadSpeedLimitToggle}
          />
          <TextField
            className='control'
            style={textFieldStyle}
            textareaStyle={textareaStyle}
            rows={1}
            rowsMax={1}
            type='number'
            value={ULspeedLimitInKB}
            onChange={this.handleUploadSpeedLimitChange}
            disabled={!this.props.state.saved.prefs.uploadSpeedLimitEnabled}
          />
          <p style={unitLabelStyle}>KB/s</p>
        </div>
      </div>
      </Preference>
    )
  }



  // Download Speed Limit functions
  handleDownloadSpeedLimitToggle (e, isChecked) {
    // Store whether or not the limit is enabled
    dispatch('updatePreferences', 'downloadSpeedLimitEnabled', isChecked)

    //Adjust speedlimit in webtorrent (-1 means disabled)
    dispatch('updateDownloadSpeedLimit', isChecked ? this.props.state.saved.prefs.downloadSpeedLimit : -1);
  }

  // Upload Speed Limit functions
  handleUploadSpeedLimitToggle (e, isChecked) {
    // Store whether or not the limit is enabled
    dispatch('updatePreferences', 'uploadSpeedLimitEnabled', isChecked)

    //Adjust speedlimit in webtorrent (-1 means disabled)
    dispatch('updateUploadSpeedLimit', isChecked ? this.props.state.saved.prefs.uploadSpeedLimit : -1);
  }



  //This converts from KB to bytes and updates prefs and webtorrent.
  handleDownloadSpeedLimitChange (e, speedLimitInKBPS) {

    // First check if the number is too large. Over 1TBPS is too large.
    if (speedLimitInKBPS > 1000000000) {
      speedLimitInKBPS = 1000000000
    }

    const speedLimitInBPS = speedLimitInKBPS * 1000;

    // Store the new rate in the persistent prefstore
    dispatch('updatePreferences', 'downloadSpeedLimit', speedLimitInBPS)

    //Dispatch to call IPC
    dispatch('updateDownloadSpeedLimit', speedLimitInBPS)
  }

  //This converts from KB to bytes and updates prefs and webtorrent.
  handleUploadSpeedLimitChange (e, speedLimitInKBPS) {

    // First check if the number is too large. Over 1TBPS is too large.
    if (speedLimitInKBPS > 1000000000) {
      speedLimitInKBPS = 1000000000
    }

    const speedLimitInBPS = speedLimitInKBPS * 1000;

    // Store the new rate in the persistent prefstore
    dispatch('updatePreferences', 'uploadSpeedLimit', speedLimitInBPS)

    //Dispatch to call IPC
    dispatch('updateUploadSpeedLimit', speedLimitInBPS)
  }


  render () {
    const style = {
      color: colors.grey400,
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
        <PreferencesSection title='Speed Limits'>
          {this.speedLimits()}
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
