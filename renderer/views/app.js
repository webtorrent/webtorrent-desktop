module.exports = App

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var Header = require('./header')
var Player = require('./player')
var TorrentList = require('./torrent-list')

var isOSX = process.platform === 'darwin'

function App (state, dispatch) {
  return hx`
    <div class='app'>
      ${getHeader()}
      <div class='content'>${getView()}</div>
    </div>
  `

  function getHeader () {
    // Hide the header on Windows/Linux when in the player
    if (isOSX || state.url !== '/player') {
      return Header(state, dispatch)
    }
  }

  function getView () {
    if (state.url === '/') {
      return TorrentList(state, dispatch)
    } else if (state.url === '/player') {
      return Player(state, dispatch)
    }
  }
}
