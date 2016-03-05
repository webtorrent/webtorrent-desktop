module.exports = App

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var Header = require('./header')
var Player = require('./player')
var TorrentList = require('./torrent-list')

function App (state, dispatch) {
  function getView () {
    if (state.view.url === '/') {
      return TorrentList(state, dispatch)
    } else if (state.view.url === '/player') {
      return Player(state, dispatch)
    }
  }

  var header = state.view.isFullScreen ? null : Header(state, dispatch)

  return hx`
    <div class="app">
      ${header}
      <div class="content">${getView()}</div>
    </div>
  `
}
