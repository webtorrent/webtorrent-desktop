const React = require('react')

const Header = require('./header')

const Views = {
  'home': require('./torrent-list'),
  'player': require('./player'),
  'create-torrent': require('./create-torrent'),
  'preferences': require('./preferences')
}

const Modals = {
  'open-torrent-address-modal': require('./open-torrent-address-modal'),
  'remove-torrent-modal': require('./remove-torrent-modal'),
  'update-available-modal': require('./update-available-modal'),
  'unsupported-media-modal': require('./unsupported-media-modal')
}

module.exports = class App extends React.Component {

  constructor (props) {
    super(props)
    this.state = props.state
  }

  render () {
    console.time('render app')
    var state = this.state

    // Hide player controls while playing video, if the mouse stays still for a while
    // Never hide the controls when:
    // * The mouse is over the controls or we're scrubbing (see CSS)
    // * The video is paused
    // * The video is playing remotely on Chromecast or Airplay
    var hideControls = state.location.url() === 'player' &&
      state.playing.mouseStationarySince !== 0 &&
      new Date().getTime() - state.playing.mouseStationarySince > 2000 &&
      !state.playing.isPaused &&
      state.playing.location === 'local' &&
      state.playing.playbackRate === 1

    var cls = [
      'view-' + state.location.url(), /* e.g. view-home, view-player */
      'is-' + process.platform /* e.g. is-darwin, is-win32, is-linux */
    ]
    if (state.window.isFullScreen) cls.push('is-fullscreen')
    if (state.window.isFocused) cls.push('is-focused')
    if (hideControls) cls.push('hide-video-controls')

    var vdom = (
      <div className={'app ' + cls.join(' ')}>
        {Header(state)}
        {getErrorPopover(state)}
        <div className='content'>{getView(state)}</div>
        {getModal(state)}
      </div>
    )
    console.timeEnd('render app')
    return vdom
  }
}

function getErrorPopover (state) {
  var now = new Date().getTime()
  var recentErrors = state.errors.filter((x) => now - x.time < 5000)
  var hasErrors = recentErrors.length > 0

  var errorElems = recentErrors.map(function (error) {
    return (<div className='error'>{error.message}</div>)
  })
  return (
    <div className={'error-popover ' + (hasErrors ? 'visible' : 'hidden')}>
      <div className='title'>Error</div>
      {errorElems}
    </div>
  )
}

function getModal (state) {
  if (!state.modal) return
  var contents = Modals[state.modal.id](state)
  return (
    <div className='modal'>
      <div className='modal-background'></div>
      <div className='modal-content'>
        {contents}
      </div>
    </div>
  )
}

function getView (state) {
  var url = state.location.url()
  return Views[url](state)
}
