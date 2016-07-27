const {dispatch} = require('../lib/dispatcher')
const State = require('../lib/state')

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
      onbeforeload: function (cb) {
        // initialize preferences
        dispatch('setTitle', 'Preferences')
        state.unsaved = Object.assign(state.unsaved || {}, {prefs: state.saved.prefs || {}})
        cb()
      },
      onbeforeunload: (cb) => {
        // save state after preferences
        this.save()
        dispatch('resetTitle')
        cb()
      }
    })
  }

  // Updates a single property in the UNSAVED prefs
  // For example: updatePreferences('foo.bar', 'baz')
  // Call savePreferences to save to config.json
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
    state.saved.prefs = Object.assign(state.saved.prefs || {}, state.unsaved.prefs)
    State.save(state)
  }
}
