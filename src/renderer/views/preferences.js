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
        {renderChannelsSection(state)}
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
    property: 'channels',
    placeholder: 'http://channel-url-here',
    onValueChange: onValueChange
  },
  state.temp_addChannel || '',
  function (channelUrl) {
    if (!channelUrl || !channelUrl.trim()) return
    // var channels = state.saved.prefs.channels || []

    dispatch('addChannel', channelUrl)
    // channels.push(channelUrl)
    // setStateValue('channels', channels)
  })

  function onValueChange(value) {
    // update value so it persists between view refreshes
    state.temp_addChannel = value
  }
}

function renderChannelsList (state) {
  var channels = state.saved.prefs.channels

  return renderButtonList({
    label: 'Existing Channels',
    description: 'List of already available channels.',
    buttons: [
      {type: 'remove_circle', click: removeChannel}
    ],
    conditionalButtons: [
      {
        type: 'check_circle', 
        property: 'enabled', 
        enabledClick: disableChannel, 
        disabledClick: enableChannel
      }
    ],
    list: channels
  })

  function isChannelEnabled (channelIndex) {
    var enabledChannels = state.saved.prefs.enabledChannels || []
    return (enabledChannels.indexOf(channelIndex) !== -1)
  }

  function removeChannel (channel, channelIndex) {
    // remove from channels
    var channels = state.saved.prefs.channels
    channels.splice(channelIndex, 1)
    setStateValue('channels', channels)

    // remove from enabled channels if enabled
    var enabledChannels = state.saved.prefs.enabledChannels
    var enabledChannelIndex = enabledChannels.indexOf(channelIndex)
    if (enabledChannelIndex === -1) return
    enabledChannels.splice(enabledChannelIndex, 1)
  }

  function enableChannel (channel, channelIndex) {
    console.log('[enableChannel]: index:', channelIndex)
    var enabledChannels = state.saved.prefs.enabledChannels || []
    if (isChannelEnabled(channelIndex)) return // already enabled!

    // save channel
    var channels = state.saved.prefs.channels
    channels[channelIndex].enabled = true
    setStateValue('channels', channels)

    // update enabled channels
    enabledChannels.push(channelIndex)
    setStateValue('enabledChannels', enabledChannels)

    // add torrents from channel to main torrents list
    dispatch('addTorrentsFromChannel', channels[channelIndex])
  }

  function disableChannel (channel, channelIndex) {
    console.log('[disableChannel]: index:', channelIndex)
    if (!isChannelEnabled(channelIndex)) {
      console.log('[disableChannel]: ALREADY DISABLED: index:', channelIndex)
      return // already disabled!
    } 

    // update enabled channels
    var enabledChannels = state.saved.prefs.enabledChannels || []
    var enabledIndex = enabledChannels.indexOf(channelIndex)
    enabledChannels.splice(enabledIndex, 1)
    setStateValue('enabledChannels', enabledChannels)

    // update channels
    var channels = state.saved.prefs.channels
    channels[channelIndex].enabled = false
    setStateValue('channels', channels)

    // remove torrents from channel from torrents list
    dispatch('removeTorrentsFromChannel', channels[channelIndex])
  }
}

function renderButtonList (definition) {
  var {list, buttons, conditionalButtons} = definition

  // iterate items and generate the html for the list
  return hx`
    <div class='control-group'>
      <div class='controls pb-sm'>
        <label class='control-label'>
          <div class='preference-title'>${definition.label}</div>
          <div class='preference-description'>${definition.description}</div>
        </label>
      </div>

      ${list.map(function (item, i) {
        return hx`
          <div class='controls'>
            <div class='controls'>
              ${buttons.map(function (button) {
                return hx`
                  <button class='btn' index='${i}' onclick=${() => button.click(item, i)}>
                    <i.icon>${button.type}</i>
                  </button>
                `
              })}

              ${conditionalButtons.map(function (button) {
                // enabled
                if (item[button.property]) {
                  return hx`
                    <button class='btn btn-enabled' index='${i}' onclick=${() => button.enabledClick(item, i)}>
                      <i.icon>${button.type}</i>
                    </button>
                  `
                }
                
                // disabled
                return hx`
                  <button class='btn btn-disabled' index='${i}' onclick=${() => button.disabledClick(item, i)}>
                    <i.icon>${button.type}</i>
                  </button>
                `
              })}

              <label class='control-label'>
                <span class='preference-title' title='${item.description}'>${item.name}, </span>
                <span class='preference-description' title='${item.url}'>${item.url}</span>
              </label>
            </div>
          </div>
        `
      })}

    </div>
  `
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
            value=${value}
            placeholder=${definition.placeholder}
            onkeyup=${handleChange} />
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

  function handleChange() {
    console.log('--- value changed', this)
    var channel = document.getElementById(definition.property).value
    definition.onValueChange(channel)
  }
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
