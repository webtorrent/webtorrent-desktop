const State = require('../lib/state')
const {dispatch} = require('../lib/dispatcher')

// Controls the Channel List screen
module.exports = class ChannelListController {
  constructor (state, config) {
    this.state = state
    this.config = config
  }

  // Goes to the Preferences screen
  show () {
    var state = this.state
    state.location.go({
      url: 'channel-list',
      setup: function (cb) {
        // initialize preferences
        dispatch('setTitle', 'Channels')
        cb()
      }
    })
  }
}
