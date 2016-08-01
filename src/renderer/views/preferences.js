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
  var channels = state.saved.prefs.channels || {}
  var channelsArray = Object.keys(channels).map((key) => channels[key])

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
    list: channelsArray
  })

  function isChannelEnabled (channel) {
    var enabledChannels = state.saved.prefs.enabledChannels || {}
    if (enabledChannels[channel.url]) return true
    return false
  }

  function removeChannel (channel) {
    // remove from channels
    var channels = state.saved.prefs.channels
    delete channels[channel.url]
    setStateValue('channels', channels)

    // remove from enabled channels if enabled
    var enabledChannels = state.saved.prefs.enabledChannels || {}
    delete enabledChannels[channel.url]
  }

  function enableChannel (channel) {
    console.log('[enableChannel]: channel:', channel)

    // save channel
    var channels = state.saved.prefs.channels
    channels[channel.url].enabled = true
    setStateValue('channels', channels)

    // update enabled channels
    var enabledChannels = state.saved.prefs.enabledChannels || {}
    enabledChannels[channel.url] = true
    setStateValue('enabledChannels', enabledChannels)
  }

  function disableChannel (channel) {
    console.log('[disableChannel]: channel:', channel)
    if (!isChannelEnabled(channel)) {
      console.log('[disableChannel]: ALREADY DISABLED: channel:', channel)
      return // already disabled!
    } 

    // update enabled channels
    var enabledChannels = state.saved.prefs.enabledChannels || {}
    delete enabledChannels[channel.url]
    setStateValue('enabledChannels', enabledChannels)

    // update channels
    var channels = state.saved.prefs.channels
    channels[channel.url].enabled = false
    setStateValue('channels', channels)
  }
}

function renderButtonList (definition) {
  var {list, buttons, conditionalButtons} = definition

  // iterate items and generate the html for the list
  return (
    <div className='control-group'>
      <div className='controls pb-sm'>
        <label className='control-label'>
          <div className='preference-title'>{definition.label}</div>
          <div className='preference-description'>{definition.description}</div>
        </label>
      </div>

      {list.map(function (item, i) {
        return (
          <div className='controls'>
            <div className='controls'>
              {buttons.map(function (button) {
                return (
                  <button className='btn' index='{i}' onClick={() => button.click(item, i)}>
                    <i className='icon'>{button.type}</i>
                  </button>
                )
              })}

              {conditionalButtons.map(function (button) {
                // enabled
                if (item[button.property]) {
                  return (
                    <button className='btn btn-enabled' index='{i}' onClick={() => button.enabledClick(item, i)}>
                      <i className='icon'>{button.type}</i>
                    </button>
                  )
                }
                
                // disabled
                return (
                  <button className='btn btn-disabled' index='{i}' onClick={() => button.disabledClick(item, i)}>
                    <i className='icon'>{button.type}</i>
                  </button>
                )
              })}

              <label className='control-label'>
                <span className='preference-title' title='{item.description}'>{item.name},</span>
                <span className='preference-description' title='{item.url}'>{item.url}</span>
              </label>
            </div>
          </div>
        )
      })}

    </div>
  )
}

function renderInput (definition, value, callback) {
  return (
    <div className='control-group'>
      <div className='controls'>
        <label className='control-label'>
          <div className='preference-title'>{definition.label}</div>
          <div className='preference-description'>{definition.description}</div>
        </label>
        <div className='controls'>
          <input type='text' className='has-button'
            id={definition.property}
            placeholder={definition.placeholder}
            onkeyup={handleChange} />

          <button className='btn' onClick={handleClick}>
            <i className='icon'>add_to_queue</i>
          </button>
        </div>
      </div>
    </div>
  )

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
