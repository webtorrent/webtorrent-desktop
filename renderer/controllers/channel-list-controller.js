const State = require('../lib/state')

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
      onbeforeload: function (cb) {
        // initialize preferences
        state.window.title = 'Channels'
        cb()
      },
      onbeforeunload: (cb) => {
        state.window.title = this.config.APP_WINDOW_TITLE
        cb()
      }
    })
  }
}
