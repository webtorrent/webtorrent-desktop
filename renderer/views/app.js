module.exports = App

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var Header = require('./header')
var Views = {
  'home': require('./torrent-list'),
  'player': require('./player'),
  'create-torrent': require('./create-torrent-page')
}
var Modals = {
  'open-torrent-address-modal': require('./open-torrent-address-modal'),
  'update-available-modal': require('./update-available-modal'),
  'unsupported-media-modal': require('./unsupported-media-modal')
}

function App (state) {
  // Hide player controls while playing video, if the mouse stays still for a while
  // Never hide the controls when:
  // * The mouse is over the controls or we're scrubbing (see CSS)
  // * The video is paused
  // * The video is playing remotely on Chromecast or Airplay
  var hideControls = state.location.url() === 'player' &&
    state.playing.mouseStationarySince !== 0 &&
    new Date().getTime() - state.playing.mouseStationarySince > 2000 &&
    !state.playing.isPaused &&
    state.playing.location === 'local'

  // Hide the header on Windows/Linux when in the player
  // On OSX, the header appears as part of the title bar
  var hideHeader = process.platform !== 'darwin' && state.location.url() === 'player'

  var cls = [
    'view-' + state.location.url(), /* e.g. view-home, view-player */
    'is-' + process.platform /* e.g. is-darwin, is-win32, is-linux */
  ]
  if (state.window.isFullScreen) cls.push('is-fullscreen')
  if (state.window.isFocused) cls.push('is-focused')
  if (hideControls) cls.push('hide-video-controls')
  if (hideHeader) cls.push('hide-header')

  return hx`
    <div class='app ${cls.join(' ')}'>
      ${Header(state)}
      ${getErrorPopover(state)}
      <div class='content'>${getView(state)}</div>
      ${getModal(state)}
    </div>
  `
}

function getErrorPopover (state) {
  var now = new Date().getTime()
  var recentErrors = state.errors.filter((x) => now - x.time < 5000)
  var hasErrors = recentErrors.length > 0

  var errorElems = recentErrors.map(function (error) {
    return hx`<div class='error'>${error.message}</div>`
  })
  return hx`
    <div class='error-popover ${hasErrors ? 'visible' : 'hidden'}'>
      <div class='title'>Error</div>
      ${errorElems}
    </div>
  `
}

function getModal (state) {
  if (!state.modal) return
  var contents = Modals[state.modal.id](state)
  return hx`
    <div class='modal'>
      <div class='modal-background'></div>
      <div class='modal-content'>
        ${contents}
      </div>
    </div>
  `
}

function getView (state) {
  var url = state.location.url()
  return Views[url](state)
}
