const path = require('path')
const React = require('react')
const PropTypes = require('prop-types')

const colors = require('material-ui/styles/colors')
const Checkbox = require('material-ui/Checkbox').default
const RaisedButton = require('material-ui/RaisedButton').default
const SelectField = require('material-ui/SelectField').default
const MenuItem = require('material-ui/MenuItem').default
const Heading = require('../components/heading')
const PathSelector = require('../components/path-selector')

const { dispatch } = require('../lib/dispatcher')
const config = require('../../config')
const fs = require('fs')
const subtitleLanguages = readSubtitleLanguages()

// Subtitle menu is a bit laggy, trying to reduce unncesessary rendering calculation by keeping this here
// Subtitle menu could be replaced with some lighter autocomplete field if/when available in material-ui
// Here we have several hundred languages
const languageMenuItems = subtitleLanguages.map(langObject => {
  return <MenuItem key={langObject.id} value={langObject.id} primaryText={langObject.label} />
})

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
          value={this.props.state.saved.prefs.downloadPath} />
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
          checked={this.props.state.saved.prefs.highestPlaybackPriority}
          label={'Highest Playback Priority'}
          onCheck={this.handleHighestPlaybackPriorityChange}
        />
        <p>Pauses all active torrents to allow playback to use all of the available bandwidth.</p>
      </Preference>
    )
  }

  searchSubtitlesOnlineCheckbox () {
    return (
      <Preference>
        <Checkbox
          className='control'
          checked={this.props.state.saved.prefs.searchSubtitlesOnline}
          label={'Search Subtitles Online'}
          onCheck={this.handleSearchSubtitlesOnlineCheckboxChange}
        />
        <p>Searches and downloads subtitles from OpenSubtitles.org</p>
      </Preference>
    )
  }

  subtitlesLanguageSelect (value, label, onChange) {
    return (
      <Preference>
        <SelectField
          value={value}
          floatingLabelText={label}
          onChange={onChange}
        >
          <MenuItem key='0' value='' primaryText='None' />
          {languageMenuItems}
        </SelectField>
      </Preference>
    )
  }

  subtitlesPrimaryLanguageSelect () {
    return this.subtitlesLanguageSelect(this.props.state.saved.prefs.subtitleLanguages[0],
      'Subtitles primary language', (e, key, value) => this.handleSubtitlesPrimaryLanguageSelectFieldChange(value))
  }

  subtitlesSecondaryLanguageSelect () {
    return this.subtitlesLanguageSelect(this.props.state.saved.prefs.subtitleLanguages[1],
      'Subtitles secondary language', (e, key, value) => this.handleSubtitlesSecondaryLanguageSelectFieldChange(value))
  }

  handleHighestPlaybackPriorityChange (e, isChecked) {
    dispatch('updatePreferences', 'highestPlaybackPriority', isChecked)
  }

  handleSearchSubtitlesOnlineCheckboxChange (e, isChecked) {
    dispatch('updatePreferences', 'searchSubtitlesOnline', isChecked)
    dispatch('setSearchSubtitles', isChecked)
  }

  handleSubtitlesPrimaryLanguageSelectFieldChange (value) {
    const languages = this.props.state.saved.prefs.subtitleLanguages.slice(0)
    languages[0] = value

    if (value.length === 0) {
      languages.splice(0)
    }

    dispatch('updatePreferences', 'subtitleLanguages', languages)
    dispatch('setSubtitleLanguages', languages)
  }

  handleSubtitlesSecondaryLanguageSelectFieldChange (value) {
    const languages = this.props.state.saved.prefs.subtitleLanguages.slice(0)
    languages[1] = value

    if (value.length === 0) {
      languages.splice(1)
    }

    dispatch('updatePreferences', 'subtitleLanguages', languages)
    dispatch('setSubtitleLanguages', languages)
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

  autoAddTorrentsCheckbox () {
    return (
      <Preference>
        <Checkbox
          className='control'
          checked={this.props.state.saved.prefs.autoAddTorrents}
          label={'Watch for new .torrent files and add them immediately'}
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
      dispatch('startFolderWatcher', null)
      return
    }

    dispatch('stopFolderWatcher', null)
  }

  torrentsFolderPathSelector () {
    const torrentsFolderPath = this.props.state.saved.prefs.torrentsFolderPath

    return (
      <Preference>
        <PathSelector
          dialog={{
            title: 'Select folder to watch for new torrents',
            properties: [ 'openDirectory' ]
          }}
          displayValue={torrentsFolderPath || ''}
          onChange={this.handletorrentsFolderPathChange}
          title='Folder to watch'
          value={torrentsFolderPath ? path.dirname(torrentsFolderPath) : null} />
      </Preference>
    )
  }

  handletorrentsFolderPathChange (filePath) {
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
            checked={this.props.state.saved.prefs.startup}
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
        <PreferencesSection title='Subtitles'>
          {this.searchSubtitlesOnlineCheckbox()}
          {this.subtitlesPrimaryLanguageSelect()}
          {this.subtitlesSecondaryLanguageSelect()}
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

function readSubtitleLanguages () {
  const languagesRaw = fs.readFileSync('ext/data/opensubtitles_languages_custom')
  const languages = []

  for (let line of languagesRaw.toString().split('\n')) {
    const parts = line.split('\t')

    if (parts[2] !== undefined) {
      languages.push({
        id: parts[0],
        label: parts[2].substr(0, 15)
      })
    }
  }

  return languages
}

module.exports = PreferencesPage
