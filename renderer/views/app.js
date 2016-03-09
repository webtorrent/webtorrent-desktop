module.exports = App

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var Header = require('./header')
var Player = require('./player')
var TorrentList = require('./torrent-list')

var isOSX = process.platform === 'darwin'

function App (state, dispatch) {
  // Hide player controls while playing video, if the mouse stays still for a while
  // Never hide the controls when:
  // * The mouse is over the controls or we're scrubbing (see CSS)
  // * The video is paused
  var hideControls = state.url === 'player' &&
    state.video.mouseStationarySince !== 0 &&
    new Date().getTime() - state.video.mouseStationarySince > 2000 &&
    !state.video.isPaused

  var cls = [
    'view-' + state.url, /* e.g. view-home, view-player */
    'is-' + process.platform /* e.g. is-darwin, is-win32, is-linux */
  ]

  if (state.window.isFullScreen) cls.push('is-fullscreen')
  if (state.window.isFocused) cls.push('is-focused')
  if (hideControls) cls.push('hide-video-controls')

  return hx`
    <div class='app ${cls.join(' ')}'>
      ${getHeader()}
      <div class='content'>${getView()}</div>
    </div>
  `

  function getHeader () {
    // Hide the header on Windows/Linux when in the player
    if (isOSX || state.url !== 'player') {
      return Header(state, dispatch)
    }
  }

  function getView () {
    if (state.url === 'home') {
      return TorrentList(state, dispatch)
    } else if (state.url === 'player') {
      return Player(state, dispatch)
    }
  }
}
