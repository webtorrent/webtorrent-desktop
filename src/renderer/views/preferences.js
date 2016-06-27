const React = require('react')
const remote = require('electron').remote
const dialog = remote.dialog
const path = require('path')

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
    renderExternalPlayerSelector(state)
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
    setStateValue('downloadPath', filePath)
  })
}

function renderExternalPlayerSelector (state) {
  return renderFileSelector({
    label: 'External Media Player',
    description: 'Progam that will be used to play media externally',
    property: 'externalPlayerPath',
    options: {
      title: 'Select media player executable',
      properties: [ 'openFile' ]
    }
  },
  state.unsaved.prefs.externalPlayerPath || '<VLC>', // TODO: should we get/store vlc path instead?
  function (filePath) {
    if (path.extname(filePath) === '.app') {
      // Get executable in packaged mac app
      var name = path.basename(filePath, '.app')
      filePath += '/Contents/MacOS/' + name
    }
    setStateValue('externalPlayerPath', filePath)
  })
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
  return (
    <div key={definition.key} className='control-group'>
      <div className='controls'>
        <label className='control-label'>
          <div className='preference-title'>{definition.label}</div>
          <div className='preference-description'>{definition.description}</div>
        </label>
        <div className='controls'>
          <input type='text' className='file-picker-text'
            id={definition.property}
            disabled='disabled'
            value={value} />
          <button className='btn' onClick={handleClick}>
            <i className='icon'>folder_open</i>
          </button>
        </div>
      </div>
    </div>
  )
  function handleClick () {
    dialog.showOpenDialog(remote.getCurrentWindow(), definition.options, function (filenames) {
      if (!Array.isArray(filenames)) return
      callback(filenames[0])
    })
  }
}

function setStateValue (property, value) {
  dispatch('updatePreferences', property, value)
}
