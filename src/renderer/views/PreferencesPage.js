const React = require('react')
const path = require('path')

const PathSelector = require('./PathSelector')

const {dispatch} = require('../lib/dispatcher')

class PreferencesPage extends React.Component {
  render () {
    var state = this.props.state
    return (
      <div className='PreferencesPage'>
        <PreferencesSection title='Downloads'>
          <Preference>
            {DownloadPathSelector(state)}
          </Preference>
        </PreferencesSection>
        <PreferencesSection title='Playback'>
          <Preference>
            {ExternalPlayerPathSelector(state)}
          </Preference>
        </PreferencesSection>
      </div>
    )
  }
}

// {ExternalPlayerCheckbox(state)}
// {DefaultAppCheckbox(state)}

class PreferencesSection extends React.Component {
  static get propTypes () {
    return {
      title: React.PropTypes.string
    }
  }

  render () {
    return (
      <div className='PreferencesSection'>
        <h2 className='title'>{this.props.title}</h2>
        {this.props.children}
      </div>
    )
  }
}

class Preference extends React.Component {
  render () {
    return (
      <div className='Preference'>
        {this.props.children}
      </div>
    )
  }
}

function DownloadPathSelector (state) {
  return (
    <PathSelector
      className='download-path'
      label='Download location'
      dialog={{
        title: 'Select download directory',
        properties: [ 'openDirectory' ]
      }}
      defaultValue={state.unsaved.prefs.downloadPath}
      onChange={handleChange}
    />
  )

  function handleChange (filePath) {
    dispatch('updatePreferences', 'downloadPath', filePath)
  }
}

function ExternalPlayerPathSelector (state) {
  return (
    <PathSelector
      className='download-path'
      label='Player app location'
      dialog={{
        title: 'Select media player app',
        properties: [ 'openFile' ]
      }}
      defaultValue={state.unsaved.prefs.externalPlayerPath || '<VLC>'}
      onChange={handleChange}
    />
  )

  function handleChange (filePath) {
    if (path.extname(filePath) === '.app') {
      // Get executable in packaged mac app
      var name = path.basename(filePath, '.app')
      filePath += '/Contents/MacOS/' + name
    }
    dispatch('updatePreferences', 'externalPlayerPath', filePath)
  }
}

// function ExternalPlayerCheckbox (state) {
//   return renderCheckbox({
//     label: 'Play in External Player',
//     description: 'Media will play in external player',
//     property: 'openExternalPlayer',
//     value: state.saved.prefs.openExternalPlayer
//   },
//   state.unsaved.prefs.openExternalPlayer,
//   function (value) {
//     dispatch('updatePreferences', 'openExternalPlayer', value)
//   })
// }

// function renderCheckbox (definition, value, callback) {
//   var iconClass = 'icon clickable'
//   if (value) iconClass += ' enabled'

//   return (
//     <div key='{definition.key}' className='control-group'>
//       <div className='controls'>
//         <label className='control-label'>
//           <div className='preference-title'>{definition.label}</div>
//         </label>
//         <div className='controls'>
//           <label className='clickable' onClick={handleClick}>
//             <i
//               className={iconClass}
//               id='{definition.property}'
//             >
//               check_circle
//             </i>
//             <span className='checkbox-label'>{definition.description}</span>
//           </label>
//         </div>
//       </div>
//     </div>
//   )
//   function handleClick () {
//     callback(!value)
//   }
// }

// function DefaultAppCheckbox (state) {
//   var definition = {
//     key: 'file-handlers',
//     label: 'Handle Torrent Files'
//   }
//   var buttonText = state.unsaved.prefs.isFileHandler
//     ? 'Remove default app for torrent files'
//     : 'Make WebTorrent the default app for torrent files'
//   var controls = [(
//     <button key='toggle-handlers'
//       className='btn'
//       onClick={toggleFileHandlers}>
//       {buttonText}
//     </button>
//   )]
//   return renderControlGroup(definition, controls)

//   function toggleFileHandlers () {
//     var isFileHandler = state.unsaved.prefs.isFileHandler
//     dispatch('updatePreferences', 'isFileHandler', !isFileHandler)
//   }
// }

module.exports = PreferencesPage
