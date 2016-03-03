module.exports = App

var h = require('virtual-dom/h')

var Header = require('./header')
var Player = require('./player')
var TorrentList = require('./torrent-list')

function App (state, dispatch) {
  return h('.app', [
    Header(state, dispatch),
    h('.content', [
      (function () {
        if (state.player === 'local') {
          return Player(state, dispatch)
        } else {
          return TorrentList(state, dispatch)
        }
      })()
    ])
  ])
}
