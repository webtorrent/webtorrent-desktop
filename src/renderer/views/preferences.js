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
    title: 'General',
    description: '',
    icon: 'settings'
  }, [
    renderDownloadDirSelector(state)
  ])
}

function renderDownloadDirSelector (state) {
  return renderFileSelector({
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

// Renders a prefs section.
// - definition should be {icon, title, description}
// - controls should be an array of vdom elements
function renderSection (definition, controls) {
  var helpElem = !definition.description ? null : (
    <div className='help text'>
      <i className='icon'>help_outline</i>{definition.description}
    </div>
  )
  return (
    <section className='section preferences-panel'>
      <div className='section-container'>
        <div className='section-heading'>
          <i className='icon'>{definition.icon}</i>{definition.title}
        </div>
        {helpElem}
        <div className='section-body'>
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
    <div className='control-group'>
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
