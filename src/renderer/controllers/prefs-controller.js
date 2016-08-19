const State = require('../lib/state')
const {dispatch} = require('../lib/dispatcher')
const ipcRenderer = require('electron').ipcRenderer

// Controls the Preferences screen
module.exports = class PrefsController {
  constructor (state, config) {
    this.state = state
    this.config = config
  }

  // Goes to the Preferences screen
  show () {
    var state = this.state
    state.location.go({
      url: 'preferences',
      setup: function (cb) {
        // initialize preferences
        state.window.title = 'Preferences'
        state.unsaved = Object.assign(state.unsaved || {}, {prefs: state.saved.prefs || {}})
        ipcRenderer.send('setAllowNav', false)
        cb()
      },
      destroy: () => {
        ipcRenderer.send('setAllowNav', true)
        this.save()
      }
    })
  }

  // Updates a single property in the UNSAVED prefs
  // For example: updatePreferences('foo.bar', 'baz')
  // Call save() to save to config.json
  update (property, value) {
    var path = property.split('.')
    var key = this.state.unsaved.prefs
    for (var i = 0; i < path.length - 1; i++) {
      if (typeof key[path[i]] === 'undefined') {
        key[path[i]] = {}
      }
      key = key[path[i]]
    }
    key[path[i]] = value
  }

  // All unsaved prefs take effect atomically, and are saved to config.json
  save () {
    var state = this.state
    if (state.unsaved.prefs.isFileHandler !== state.saved.prefs.isFileHandler) {
      ipcRenderer.send('setDefaultFileHandler', state.unsaved.prefs.isFileHandler)
    }
    state.saved.prefs = Object.assign(state.saved.prefs || {}, state.unsaved.prefs)
    State.save(state)
    dispatch('checkDownloadPath')
  }
}
