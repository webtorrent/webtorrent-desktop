module.exports = App

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var Header = require('./header')
var Player = require('./player')
var TorrentList = require('./torrent-list')
var Modals = {
  'open-torrent-address-modal': require('./open-torrent-address-modal')
}

function App (state, dispatch) {
  // Hide player controls while playing video, if the mouse stays still for a while
  // Never hide the controls when:
  // * The mouse is over the controls or we're scrubbing (see CSS)
  // * The video is paused
  // * The video is playing remotely on Chromecast or Airplay
  var hideControls = state.url === 'player' &&
    state.video.mouseStationarySince !== 0 &&
    new Date().getTime() - state.video.mouseStationarySince > 2000 &&
    !state.video.isPaused &&
    state.video.location === 'local'

  // Hide the header on Windows/Linux when in the player
  // On OSX, the header appears as part of the title bar
  var hideHeader = process.platform !== 'darwin' && state.url === 'player'

  var cls = [
    'view-' + state.url, /* e.g. view-home, view-player */
    'is-' + process.platform /* e.g. is-darwin, is-win32, is-linux */
  ]
  if (state.window.isFullScreen) cls.push('is-fullscreen')
  if (state.window.isFocused) cls.push('is-focused')
  if (hideControls) cls.push('hide-video-controls')
  if (hideHeader) cls.push('hide-header')

  return hx`
    <div class='app ${cls.join(' ')}'>
      ${Header(state, dispatch)}
      ${getErrorPopover()}
      <div class='content'>${getView()}</div>
      ${getModal()}
    </div>
  `

  function getErrorPopover () {
    var now = new Date().getTime()
    var recentErrors = state.errors.filter((x) => now - x.time < 5000)

    var errorElems = recentErrors.map(function (error) {
      return hx`<div class='error'>${error.message}</div>`
    })
    return hx`
    <div class='error-popover ${recentErrors.length > 0 ? 'visible' : 'hidden'}'>
        <div class='title'>Error</div>
        ${errorElems}
      </div>
    `
  }

  function getModal () {
    if (state.modal) {
      var contents = Modals[state.modal](state, dispatch)
      return hx`
        <div class='modal'>
          <div class='modal-background'></div>
          <div class='modal-content add-file-modal'>
            ${contents}
          </div>
        </div>
      `
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
