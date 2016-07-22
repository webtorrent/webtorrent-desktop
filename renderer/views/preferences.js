module.exports = Preferences

var hx = require('../lib/hx')
var {dispatch} = require('../lib/dispatcher')

var remote = require('electron').remote
var dialog = remote.dialog

function Preferences (state) {
  return hx`
    <div class='preferences'>
      ${renderGeneralSection(state)},
      ${renderChannelsSection(state)}
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

function renderChannelsSection (state) {
  return renderSection({
    title: 'Channels',
    description: '',
    icon: 'settings'
  }, [
    renderAddChannelInput(state),
    renderChannelsList(state)
  ])
}

function renderAddChannelInput (state) {
  return renderInput({
    label: 'Add Channel',
    description: 'Channels provide easy access to categorized and curated video content',
    property: 'channels'
  },
  'http://channel-url-here',
  function (channel) {
    if (!channel || !channel.trim()) return
    var channels = state.saved.prefs.channels || []
    channels.push(channel)
    setStateValue('channels', channels)
  })
}

function renderChannelsList (state) {
  return renderButtonList({
    label: 'Existing Channels',
    description: 'List of already available channels.',
    button: 'remove_circle',
    channels: [
      {
        url: 'http://test.torrent-channels.org',
        name: 'Test Channel',
        description: 'This is a test channel.'
      }
    ]
  },
  'http://channel-url-here',
  function (channelIndex) {
    if (!channelIndex) return
    var channels = state.saved.prefs.channels
    channels.splice(channelIndex, 1)
    setStateValue('channels', channels)
  })
}

function renderButtonList (definition, value, callback) {
  var channels = definition.channels

  // iterate channels and generate the html for the list
  return hx`
    <div class='control-group'>
      <div class='controls pb-sm'>
        <label class='control-label'>
          <div class='preference-title'>${definition.label}</div>
          <div class='preference-description'>${definition.description}</div>
        </label>
      </div>

      ${channels.map(function (channel, i) {
        return hx`
          <div class='controls'>
            <div class='controls'>
              <button class='btn' index='${i}' onclick=${handleClick}>
                <i.icon>${definition.button}</i>
              </button>

              <label class='control-label'>
                <span class='preference-title' title='${channel.description}'>${channel.name}, </span>
                <span class='preference-description' title='${channel.url}'>${channel.url}</span>
              </label>
            </div>
          </div>
        `
      })}

    </div>
  `

  function handleClick (e) {
    callback(this.index)
  }
}

function renderInput (definition, value, callback) {
  return hx`
    <div class='control-group'>
      <div class='controls'>
        <label class='control-label'>
          <div class='preference-title'>${definition.label}</div>
          <div class='preference-description'>${definition.description}</div>
        </label>
        <div class='controls'>
          <input type='text' class='has-button'
            id=${definition.property}
            value=${value} />
          <button class='btn' onclick=${handleClick}>
            <i.icon>add_to_queue</i>
          </button>
        </div>
      </div>
    </div>
  `
  function handleClick () {
    var channel = document.getElementById(definition.property).value
    callback(channel)
  }
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
