const { dispatch } = require('../lib/dispatcher')
const ipcRenderer = require('electron').ipcRenderer

// Controls the Search torrents screen
module.exports = class SearchTorrentsController {
  constructor (state, config) {
    this.state = state
    this.config = config
  }

  // Goes to the Search torrents screen
  show () {
    const state = this.state
    state.location.go({
      url: 'search-torrents',
      setup: function (cb) {
        // initialize search torrents page
        state.window.title = 'Search Torrents'
        ipcRenderer.send('setAllowNav', false)
        cb()
      },
      destroy: () => {
        ipcRenderer.send('setAllowNav', true)
      }
    })
  }
}
