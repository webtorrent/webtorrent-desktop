module.exports = App

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var Header = require('./header')
var Player = require('./player')
var TorrentList = require('./torrent-list')

function App (state, dispatch) {
  function getView () {
    if (state.temp.url === '/') {
      return TorrentList(state, dispatch)
    } else if (state.temp.url === '/player') {
      return Player(state, dispatch)
    }
  }

  // Show the header only when we're outside of fullscreen
  // Also don't show it in the video player except in OSX
  var isOSX = process.platform === 'darwin'
  var isVideo = state.temp.url === '/player'
  var isFullScreen = state.temp.isFullScreen
  var header = !isFullScreen && (!isVideo || isOSX) ? Header(state, dispatch) : null

  return hx`
    <div class="app">
      ${header}
      <div class="content">${getView()}</div>
    </div>
  `
}
