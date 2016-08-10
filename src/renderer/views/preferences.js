const React = require('react')
const remote = require('electron').remote
const dialog = remote.dialog

const {dispatch} = require('../lib/dispatcher')

module.exports = class Preferences extends React.Component {
  render () {
    var state = this.props.state
    return (
      <div className='preferences'>
        {renderGeneralSection(state)}
      </div>
    )
  }
}

function renderGeneralSection (state) {
  return renderSection({
    key: 'general',
    title: 'General',
    description: '',
    icon: 'settings'
  }, [
    renderDownloadDirSelector(state),
    renderFileHandlers(state)
  ])
}

function renderDownloadDirSelector (state) {
  return renderFileSelector({
    key: 'download-path',
    label: 'Download Path',
    description: 'Data from torrents will be saved here',
    property: 'downloadPath',
    options: {
      title: 'Select download directory',
      properties: [ 'openDirectory' ]
    }
  },
  state.unsaved.prefs.downloadPath,
  function (filePath) {
    dispatch('updatePreferences', 'downloadPath', filePath)
  })
}

function renderFileHandlers (state) {
  var definition = {
    key: 'file-handlers',
    label: 'Handle Torrent Files'
  }
  var buttonText = state.unsaved.prefs.isFileHandler
    ? 'Remove default app for torrent files'
    : 'Make WebTorrent the default app for torrent files'
  var controls = [(
    <button key='toggle-handlers'
      className='btn'
      onClick={toggleFileHandlers}>
      {buttonText}
    </button>
  )]
  return renderControlGroup(definition, controls)

  function toggleFileHandlers () {
    var isFileHandler = state.unsaved.prefs.isFileHandler
    dispatch('updatePreferences', 'isFileHandler', !isFileHandler)
  }
}

// Renders a prefs section.
// - definition should be {icon, title, description}
// - controls should be an array of vdom elements
function renderSection (definition, controls) {
  var helpElem = !definition.description ? null : (
    <div key='help' className='help text'>
      <i className='icon'>help_outline</i>{definition.description}
    </div>
  )
  return (
    <section key={definition.key} className='section preferences-panel'>
      <div className='section-container'>
        <div key='heading' className='section-heading'>
          <i className='icon'>{definition.icon}</i>{definition.title}
        </div>
        {helpElem}
        <div key='body' className='section-body'>
          {controls}
        </div>
      </div>
    </section>
  )
}

// Creates a file chooser
// - defition should be {label, description, options}
//   options are passed to dialog.showOpenDialog
// - value should be the current pref, a file or folder path
// - callback takes a new file or folder path
function renderFileSelector (definition, value, callback) {
  var controls = [(
    <input
      type='text'
      className='file-picker-text'
      key={definition.property}
      id={definition.property}
      disabled='disabled'
      value={value} />
  ), (
    <button
      key={definition.property + '-btn'}
      className='btn'
      onClick={handleClick}>
      <i className='icon'>folder_open</i>
    </button>
  )]
  return renderControlGroup(definition, controls)

  function handleClick () {
    dialog.showOpenDialog(remote.getCurrentWindow(), definition.options, function (filenames) {
      if (!Array.isArray(filenames)) return
      callback(filenames[0])
    })
  }
}

function renderControlGroup (definition, controls) {
  return (
    <div key={definition.key} className='control-group'>
      <div className='controls'>
        <label className='control-label'>
          <div className='preference-title'>{definition.label}</div>
          <div className='preference-description'>{definition.description}</div>
        </label>
        <div className='controls'>
          {controls}
        </div>
      </div>
    </div>
  )
}
