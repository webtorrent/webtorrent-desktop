module.exports = Preferences

var fs = require('fs-extra')
var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)
var {dispatch} = require('../lib/dispatcher')

var remote = require('electron').remote
var dialog = remote.dialog

var prefState

function Preferences (state) {
  prefState = state.unsaved.prefs
  var definitions = getPreferenceDefinitions()
  var sections = []

  definitions.forEach(function (sectionDefinition) {
    sections.push(renderSection(sectionDefinition))
  })

  return hx`
    <div class='preferences'>
      ${sections}
    </div>
  `
}

function renderSection (definition) {
  var controls = []

  definition.controls.forEach(function (controlDefinition) {
    controls.push(controlDefinition.renderer(controlDefinition))
  })

  return hx`
    <section class='section preferences-panel'>
      <div class='section-container'>
        <div class='section-heading'><i.icon>${definition.icon}</i>${definition.title}</div>
          <div class='help text'><i.icon>help_outline</i>${definition.description}</div>
          <div class='section-body'>
          ${controls}
          </div>
      </div>
    </section>
  `
}

function renderFileSelector (definition) {
  var value = getStateValue(definition.property)
  return hx`
    <div class='control-group'>
      <div class='controls'>
        <label class='control-label'>
          <div class='preference-title'>${definition.label}</div>
          <div class='preference-description'>${definition.description}</div>
        </label>
        <div class='controls'>
          <input type='text' class='file-picker-text'
            id=${definition.property} placeholder=${definition.placeholder}
            readonly='readonly'
            value=${value}/>
          <button class='btn' onclick=${filePickerHandler}><i.icon>folder_open</i></button>
        </div>
      </div>
    </div>
  `
  function filePickerHandler () {
    dialog.showOpenDialog(remote.getCurrentWindow(), definition.options, function (filenames) {
      if (!Array.isArray(filenames)) return
      if (!definition.validator || definition.validator(filenames[0])) {
        setStateValue(definition.property, filenames[0])
      }
    })
  }
}

/*
function renderCheckbox (definition) {
  var checked = getStateValue(definition.property)
  var checkbox = checked ? 'check_box' : 'check_box_outline_blank'
  return hx`
    <div class='control-group'>
      <div class='controls'>
        <div class='checkbox'>
          <label class='control-label'>
            <i.icon onclick=${checkboxHandler}>${checkbox}</i>
            <div class='preference-title' onclick=${checkboxHandler}>${definition.label}</div>
          </label>
          <div class='preference-description'>${definition.description}</div>
        </div>
      </div>
    </div>
  `
  function checkboxHandler (e) {
    setStateValue(definition.property, !getStateValue(definition.property))
  }
}
*/

function getPreferenceDefinitions () {
  return [
    {
      title: 'General',
      description: 'These are WebTorrent Desktop main preferences. Will put a very long text to check if it overflows correctly.',
      icon: 'settings',
      controls: [
        {
          label: 'Download Path',
          description: 'Directory where the files will be stored. Please, check if it has enough space!',
          property: 'downloadPath',
          renderer: renderFileSelector,
          placeholder: 'Your downloads directory ie: $HOME/Downloads',
          options: {
            title: 'Select download directory.',
            properties: [ 'openDirectory' ]
          },
          validator: function (value) {
            return fs.existsSync(value)
          }
        }
      ]
    }/*,
    {
      title: 'Interface',
      description: 'Here you can change the way the application looks and beahaves.',
      icon: 'view_compact',
      controls: [
        {
          label: 'Disable Tray',
          description: 'This option gives you the chance to quit immediately and don\'t send the application to background when you close it.',
          property: 'interface.disableTray',
          renderer: renderCheckbox
        }
      ]
    }*/
  ]
}

function getStateValue (property) {
  var path = property.split('.')
  var key = prefState
  for (var i = 0; i < path.length - 1; i++) {
    if (typeof key[path[i]] === 'undefined') {
      return ''
    }
    key = key[path[i]]
  }
  return key[path[i]]
}

function setStateValue (property, value) {
  dispatch('updatePreferences', property, value)
}
