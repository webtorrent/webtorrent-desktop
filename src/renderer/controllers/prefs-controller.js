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
    const state = this.state
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
    const path = property.split('.')
    let obj = this.state.unsaved.prefs
    let i
    for (i = 0; i < path.length - 1; i++) {
      if (typeof obj[path[i]] === 'undefined') {
        obj[path[i]] = {}
      }
      obj = obj[path[i]]
    }
    obj[path[i]] = value
  }

  // All unsaved prefs take effect atomically, and are saved to config.json
  save () {
    const state = this.state
    if (state.unsaved.prefs.isFileHandler !== state.saved.prefs.isFileHandler) {
      ipcRenderer.send('setDefaultFileHandler', state.unsaved.prefs.isFileHandler)
    }
    state.saved.prefs = Object.assign(state.saved.prefs || {}, state.unsaved.prefs)
    State.save(state)
    dispatch('checkDownloadPath')
  }
}
