const colors = require('material-ui/styles/colors')
const createGetter = require('fn-getter')
const React = require('react')

const darkBaseTheme = require('material-ui/styles/baseThemes/darkBaseTheme').default
const getMuiTheme = require('material-ui/styles/getMuiTheme').default
const MuiThemeProvider = require('material-ui/styles/MuiThemeProvider').default

const Header = require('../components/header')

// Perf optimization: Needed immediately, so do not lazy load it below
const TorrentListPage = require('./torrent-list-page')

const Views = {
  home: createGetter(() => TorrentListPage),
  player: createGetter(() => require('./player-page')),
  'create-torrent': createGetter(() => require('./create-torrent-page')),
  preferences: createGetter(() => require('./preferences-page'))
}

const Modals = {
  'open-torrent-address-modal': createGetter(
    () => require('../components/open-torrent-address-modal')
  ),
  'remove-torrent-modal': createGetter(() => require('../components/remove-torrent-modal')),
  'update-available-modal': createGetter(() => require('../components/update-available-modal')),
  'unsupported-media-modal': createGetter(() => require('../components/unsupported-media-modal'))
}

const fontFamily = process.platform === 'win32'
  ? '"Segoe UI", sans-serif'
  : 'BlinkMacSystemFont, "Helvetica Neue", Helvetica, sans-serif'

darkBaseTheme.fontFamily = fontFamily
darkBaseTheme.userAgent = false
darkBaseTheme.palette.primary1Color = colors.grey50
darkBaseTheme.palette.primary2Color = colors.grey50
darkBaseTheme.palette.primary3Color = colors.grey600
darkBaseTheme.palette.accent1Color = colors.redA200
darkBaseTheme.palette.accent2Color = colors.redA400
darkBaseTheme.palette.accent3Color = colors.redA100

let darkMuiTheme
let lightMuiTheme

class App extends React.Component {
  render () {
    const state = this.props.state

    // Hide player controls while playing video, if the mouse stays still for a while
    // Never hide the controls when:
    // * The mouse is over the controls or we're scrubbing (see CSS)
    // * The video is paused
    // * The video is playing remotely on Chromecast or Airplay
    const hideControls = state.shouldHidePlayerControls()

    const cls = [
      'view-' + state.location.url(), /* e.g. view-home, view-player */
      'is-' + process.platform /* e.g. is-darwin, is-win32, is-linux */
    ]
    if (state.window.isFullScreen) cls.push('is-fullscreen')
    if (state.window.isFocused) cls.push('is-focused')
    if (hideControls) cls.push('hide-video-controls')

    if (!darkMuiTheme) {
      darkMuiTheme = getMuiTheme(darkBaseTheme)
    }

    return (
      <MuiThemeProvider muiTheme={darkMuiTheme}>
        <div className={'app ' + cls.join(' ')}>
          <Header state={state} />
          {this.getErrorPopover()}
          <div key='content' className='content'>{this.getView()}</div>
          {this.getModal()}
        </div>
      </MuiThemeProvider>
    )
  }

  getErrorPopover () {
    const state = this.props.state
    const now = new Date().getTime()
    const recentErrors = state.errors.filter((x) => now - x.time < 5000)
    const hasErrors = recentErrors.length > 0

    const errorElems = recentErrors.map(function (error, i) {
      return (<div key={i} className='error'>{error.message}</div>)
    })
    return (
      <div
        key='errors'
        className={'error-popover ' + (hasErrors ? 'visible' : 'hidden')}>
        <div key='title' className='title'>Error</div>
        {errorElems}
      </div>
    )
  }

  getModal () {
    const state = this.props.state
    if (!state.modal) return

    if (!lightMuiTheme) {
      const lightBaseTheme = require('material-ui/styles/baseThemes/lightBaseTheme').default
      lightBaseTheme.fontFamily = fontFamily
      lightBaseTheme.userAgent = false
      lightMuiTheme = getMuiTheme(lightBaseTheme)
    }

    const ModalContents = Modals[state.modal.id]()
    return (
      <MuiThemeProvider muiTheme={lightMuiTheme}>
        <div key='modal' className='modal'>
          <div key='modal-background' className='modal-background' />
          <div key='modal-content' className='modal-content'>
            <ModalContents state={state} />
          </div>
        </div>
      </MuiThemeProvider>
    )
  }

  getView () {
    const state = this.props.state
    const View = Views[state.location.url()]()
    return (<View state={state} />)
  }
}

module.exports = App
