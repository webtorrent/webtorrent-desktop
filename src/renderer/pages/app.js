const createGetter = require('fn-getter')
const React = require('react')

const { ThemeProvider, createTheme } = require('@material-ui/core/styles')
const grey = require('@material-ui/core/colors/grey').default
const red = require('@material-ui/core/colors/red').default

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
  'unsupported-media-modal': createGetter(() => require('../components/unsupported-media-modal')),
  'delete-all-torrents-modal':
      createGetter(() => require('../components/delete-all-torrents-modal'))
}

const fontFamily = process.platform === 'win32'
  ? '"Segoe UI", sans-serif'
  : 'BlinkMacSystemFont, "Helvetica Neue", Helvetica, sans-serif'

let darkTheme
let lightTheme

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

    if (!darkTheme) {
      darkTheme = createTheme({
        overrides: {
          MuiButton: {
            contained: {
              backgroundColor: '#303030',
              color: 'white',
              '&:hover': {
                backgroundColor: '#414141',
                // Reset on touch devices, it doesn't add specificity
                '@media (hover: none)': {
                  backgroundColor: '#303030',
                  color: 'white'
                }
              }
            }
          },
          MuiCheckbox: {
            root: {
              padding: '0px',
              marginRight: '16px'
            }
          },
          MuiFormControlLabel: {
            label: {
              color: 'white',
              fontSize: '0.875rem'
            },
            root: {
              marginLeft: '0px',
              marginRight: '0px'
            }
          }
        },
        palette: {
          primary: {
            main: grey['50']
          },
          secondary: {
            main: grey['50']
          },
          type: 'dark'
        },
        typography: {
          fontFamily
        }
      }, {
        userAgent: false
      })
    }

    return (
      <ThemeProvider theme={darkTheme}>
        <div className={'app ' + cls.join(' ')}>
          <Header state={state} />
          {this.getErrorPopover()}
          <div key='content' className='content'>{this.getView()}</div>
          {this.getModal()}
        </div>
      </ThemeProvider>
    )
  }

  getErrorPopover () {
    const state = this.props.state
    const now = new Date().getTime()
    const recentErrors = state.errors.filter((x) => now - x.time < 5000)
    const hasErrors = recentErrors.length > 0

    const errorElems = recentErrors.map((error, i) => <div key={i} className='error'>{error.message}</div>)
    return (
      <div
        key='errors'
        className={'error-popover ' + (hasErrors ? 'visible' : 'hidden')}
      >
        <div key='title' className='title'>Error</div>
        {errorElems}
      </div>
    )
  }

  getModal () {
    const state = this.props.state
    if (!state.modal) return

    if (!lightTheme) {
      lightTheme = createTheme({
        palette: {
          secondary: {
            main: red.A200
          },
          type: 'light'
        },
        typography: {
          fontFamily
        }
      }, {
        userAgent: false
      })
    }

    const ModalContents = Modals[state.modal.id]()
    return (
      <ThemeProvider theme={lightTheme}>
        <div key='modal' className='modal'>
          <div key='modal-background' className='modal-background' />
          <div key='modal-content' className='modal-content'>
            <ModalContents state={state} />
          </div>
        </div>
      </ThemeProvider>
    )
  }

  getView () {
    const state = this.props.state
    const View = Views[state.location.url()]()
    return (<View state={state} />)
  }
}

module.exports = App
