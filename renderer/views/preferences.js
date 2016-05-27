module.exports = Preferences

var hx = require('../lib/hx')
var {dispatch} = require('../lib/dispatcher')

var remote = require('electron').remote
var dialog = remote.dialog

function Preferences (state) {
  return hx`
    <div class='preferences'>
      ${renderGeneralSection(state)}
    </div>
  `
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
  var helpElem = !definition.description ? null : hx`
    <div class='help text'>
      <i.icon>help_outline</i>${definition.description}
    </div>
  `
  return hx`
    <section class='section preferences-panel'>
      <div class='section-container'>
        <div class='section-heading'>
          <i.icon>${definition.icon}</i>${definition.title}
        </div>
        ${helpElem}
        <div class='section-body'>
          ${controls}
        </div>
      </div>
    </section>
  `
}

// Creates a file chooser
// - defition should be {label, description, options}
//   options are passed to dialog.showOpenDialog
// - value should be the current pref, a file or folder path
// - callback takes a new file or folder path
function renderFileSelector (definition, value, callback) {
  return hx`
    <div class='control-group'>
      <div class='controls'>
        <label class='control-label'>
          <div class='preference-title'>${definition.label}</div>
          <div class='preference-description'>${definition.description}</div>
        </label>
        <div class='controls'>
          <input type='text' class='file-picker-text'
            id=${definition.property}
            disabled='disabled'
            value=${value} />
          <button class='btn' onclick=${handleClick}>
            <i.icon>folder_open</i>
          </button>
        </div>
      </div>
    </div>
  `
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
