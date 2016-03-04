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
        if (state.view.url === '/') {
          return TorrentList(state, dispatch)
        } else if (state.view.url === '/player') {
          return Player(state, dispatch)
        }
      })()
    ])
  ])
}
