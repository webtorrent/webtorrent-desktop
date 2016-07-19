console.time('init')

const crashReporter = require('../crash-reporter')
crashReporter.init()

const dragDrop = require('drag-drop')
const electron = require('electron')
const React = require('react')
const ReactDOM = require('react-dom')

const config = require('../config')
const App = require('./views/app')
const telemetry = require('./lib/telemetry')
const sound = require('./lib/sound')
const State = require('./lib/state')
const TorrentPlayer = require('./lib/torrent-player')

const MediaController = require('./controllers/media-controller')
const UpdateController = require('./controllers/update-controller')
const PrefsController = require('./controllers/prefs-controller')
const PlaybackController = require('./controllers/playback-controller')
const SubtitlesController = require('./controllers/subtitles-controller')
const TorrentListController = require('./controllers/torrent-list-controller')
const TorrentController = require('./controllers/torrent-controller')

// Yo-yo pattern: state object lives here and percolates down thru all the views.
// Events come back up from the views via dispatch(...)
require('./lib/dispatcher').setDispatch(dispatch)

// From dispatch(...), events are sent to one of the controllers
var controllers = null

// This dependency is the slowest-loading, so we lazy load it
var Cast = null

// Electron apps have two processes: a main process (node) runs first and starts
// a renderer process (essentially a Chrome window). We're in the renderer process,
// and this IPC channel receives from and sends messages to the main process
var ipcRenderer = electron.ipcRenderer

// All state lives in state.js. `state.saved` is read from and written to a file.
// All other state is ephemeral. First we load state.saved then initialize the app.
var state

// Root React component
var app

State.load(onState)

// Called once when the application loads. (Not once per window.)
// Connects to the torrent networks, sets up the UI and OS integrations like
// the dock icon and drag+drop.
function onState (err, _state) {
  if (err) return onError(err)
  state = _state

  // Create controllers
  controllers = {
    media: new MediaController(state),
    update: new UpdateController(state),
    prefs: new PrefsController(state, config),
    playback: new PlaybackController(state, config, update),
    subtitles: new SubtitlesController(state),
    torrentList: new TorrentListController(state),
    torrent: new TorrentController(state)
  }

  // Add first page to location history
  state.location.go({ url: 'home' })

  // Restart everything we were torrenting last time the app ran
  resumeTorrents()

  // Lazy-load other stuff, like the AppleTV module, later to keep startup fast
  window.setTimeout(delayedInit, config.DELAYED_INIT)

  // Listen for messages from the main process
  setupIpc()

  // Calling update() updates the UI given the current state
  // Do this at least once a second to give every file in every torrentSummary
  // a progress bar and to keep the cursor in sync when playing a video
  setInterval(update, 1000)
  window.requestAnimationFrame(renderIfNecessary)
  app = ReactDOM.render(<App state={state} />, document.querySelector('body'))

  // OS integrations:
  // ...drag and drop a torrent or video file to play or seed
  dragDrop('body', onOpen)

  // ...same thing if you paste a torrent
  document.addEventListener('paste', onPaste)

  // ...focus and blur. Needed to show correct dock icon text ('badge') in OSX
  window.addEventListener('focus', onFocus)
  window.addEventListener('blur', onBlur)

  // ...window visibility state.
  document.addEventListener('webkitvisibilitychange', onVisibilityChange)

  // Log uncaught JS errors
  window.addEventListener('error',
    (e) => telemetry.logUncaughtError('window', e.error || e.target), true)

  // Done! Ideally we want to get here < 500ms after the user clicks the app
  sound.play('STARTUP')
  console.timeEnd('init')
}

// Runs a few seconds after the app loads, to avoid slowing down startup time
function delayedInit () {
  lazyLoadCast()
  sound.preload()
  telemetry.init(state)
}

// Lazily loads Chromecast and Airplay support
function lazyLoadCast () {
  if (!Cast) {
    Cast = require('./lib/cast')
    Cast.init(state, update) // Search the local network for Chromecast and Airplays
  }
  return Cast
}

// Calls render() to go from state -> UI, then applies to vdom to the real DOM.
// Runs at 60fps, but only executes when necessary
var needsRender = 0

function renderIfNecessary () {
  if (needsRender > 1) console.log('combining %d update() calls into one update', needsRender)
  if (needsRender) {
    controllers.playback.showOrHidePlayerControls()
    app.setState(state)
    updateElectron()
    needsRender = 0
  }
  window.requestAnimationFrame(renderIfNecessary)
}

function update () {
  needsRender++
}

// Some state changes can't be reflected in the DOM, instead we have to
// tell the main process to update the window or OS integrations
function updateElectron () {
  if (state.window.title !== state.prev.title) {
    state.prev.title = state.window.title
    ipcRenderer.send('setTitle', state.window.title)
  }
  if (state.dock.progress !== state.prev.progress) {
    state.prev.progress = state.dock.progress
    ipcRenderer.send('setProgress', state.dock.progress)
  }
  if (state.dock.badge !== state.prev.badge) {
    state.prev.badge = state.dock.badge
    ipcRenderer.send('setBadge', state.dock.badge || '')
  }
}

const dispatchHandlers = {
  // Torrent list: creating, deleting, selecting torrents
  'openTorrentFile': () => ipcRenderer.send('openTorrentFile'),
  'openFiles': () => ipcRenderer.send('openFiles'), /* shows the open file dialog */
  'openTorrentAddress': () => { state.modal = { id: 'open-torrent-address-modal' } },

  'addTorrent': (torrentId) => controllers.torrentList.addTorrent(torrentId),
  'showCreateTorrent': (paths) => controllers.torrentList.showCreateTorrent(paths),
  'toggleCreateTorrentAdvanced': () => controllers.torrentList.toggleCreateTorrentAdvanced(),
  'createTorrent': (options) => controllers.torrentList.createTorrent(options),
  'toggleTorrent': (infoHash) => controllers.torrentList.toggleTorrent(infoHash),
  'toggleTorrentFile': (infoHash, index) => controllers.torrentList.toggleTorrentFile(infoHash, index),
  'confirmDeleteTorrent': (infoHash, deleteData) => controllers.torrentList.confirmDeleteTorrent(infoHash, deleteData),
  'deleteTorrent': (infoHash, deleteData) => controllers.torrentList.deleteTorrent(infoHash, deleteData),
  'toggleSelectTorrent': (infoHash) => controllers.torrentList.toggleSelectTorrent(infoHash),
  'openTorrentContextMenu': (infoHash) => controllers.torrentList.openTorrentContextMenu(infoHash),
  'startTorrentingSummary': (torrentSummary) =>
    controllers.torrentList.startTorrentingSummary(torrentSummary),

  // Playback
  'playFile': (infoHash, index) => controllers.playback.playFile(infoHash, index),
  'playPause': () => controllers.playback.playPause(),
  'skip': (time) => controllers.playback.skip(time),
  'skipTo': (time) => controllers.playback.skipTo(time),
  'changePlaybackRate': (dir) => controllers.playback.changePlaybackRate(dir),
  'changeVolume': (delta) => controllers.playback.changeVolume(delta),
  'setVolume': (vol) => controllers.playback.setVolume(vol),
  'openItem': (infoHash, index) => controllers.playback.openItem(infoHash, index),

  // Subtitles
  'openSubtitles': () => controllers.subtitles.openSubtitles(),
  'selectSubtitle': (index) => controllers.subtitles.selectSubtitle(index),
  'toggleSubtitlesMenu': () => controllers.subtitles.toggleSubtitlesMenu(),
  'checkForSubtitles': () => controllers.subtitles.checkForSubtitles(),
  'addSubtitles': (files, autoSelect) => controllers.subtitles.addSubtitles(files, autoSelect),

  // Local media: <video>, <audio>, VLC
  'mediaStalled': () => controllers.media.mediaStalled(),
  'mediaError': (err) => controllers.media.mediaError(err),
  'mediaSuccess': () => controllers.media.mediaSuccess(),
  'mediaTimeUpdate': () => controllers.media.mediaTimeUpdate(),
  'mediaMouseMoved': () => controllers.media.mediaMouseMoved(),
  'vlcPlay': () => controllers.media.vlcPlay(),
  'vlcNotFound': () => controllers.media.vlcNotFound(),

  // Remote casting: Chromecast, Airplay, etc
  'toggleCastMenu': (deviceType) => lazyLoadCast().toggleMenu(deviceType),
  'selectCastDevice': (index) => lazyLoadCast().selectDevice(index),
  'stopCasting': () => lazyLoadCast().stop(),

  // Preferences screen
  'preferences': () => controllers.prefs.show(),
  'updatePreferences': (key, value) => controllers.prefs.update(key, value),

  // Update (check for new versions on Linux, where there's no auto updater)
  'updateAvailable': (version) => controllers.update.updateAvailable(version),
  'skipVersion': (version) => controllers.update.skipVersion(version),

  // Navigation between screens (back, forward, ESC, etc)
  'exitModal': () => { state.modal = null },
  'backToList': backToList,
  'escapeBack': escapeBack,
  'back': () => state.location.back(),
  'forward': () => state.location.forward(),

  // Controlling the window
  'setDimensions': setDimensions,
  'toggleFullScreen': (setTo) => ipcRenderer.send('toggleFullScreen', setTo),
  'setTitle': (title) => { state.window.title = title },

  // Everything else
  'onOpen': onOpen,
  'error': onError,
  'uncaughtError': (proc, err) => telemetry.logUncaughtError(proc, err),
  'saveState': () => State.save(state),
  'saveStateThrottled': () => State.saveThrottled(state),
  'update': () => {} // No-op, just trigger an update
}

// Events from the UI never modify state directly. Instead they call dispatch()
function dispatch (action, ...args) {
  // Log dispatch calls, for debugging
  if (!['mediaMouseMoved', 'mediaTimeUpdate'].includes(action)) {
    console.log('dispatch: %s %o', action, args)
  }

  var handler = dispatchHandlers[action]
  if (handler) handler(...args)
  else console.error('Missing dispatch handler: ' + action)

  // Update the virtual DOM, unless it's just a mouse move event
  if (action !== 'mediaMouseMoved' ||
      controllers.playback.showOrHidePlayerControls()) {
    update()
  }
}

// Listen to events from the main and webtorrent processes
function setupIpc () {
  ipcRenderer.on('log', (e, ...args) => console.log(...args))
  ipcRenderer.on('error', (e, ...args) => console.error(...args))

  ipcRenderer.on('dispatch', (e, ...args) => dispatch(...args))

  ipcRenderer.on('fullscreenChanged', onFullscreenChanged)

  var tc = controllers.torrent
  ipcRenderer.on('wt-infohash', (e, ...args) => tc.torrentInfoHash(...args))
  ipcRenderer.on('wt-metadata', (e, ...args) => tc.torrentMetadata(...args))
  ipcRenderer.on('wt-done', (e, ...args) => tc.torrentDone(...args))
  ipcRenderer.on('wt-warning', (e, ...args) => tc.torrentWarning(...args))
  ipcRenderer.on('wt-error', (e, ...args) => tc.torrentError(...args))

  ipcRenderer.on('wt-progress', (e, ...args) => tc.torrentProgress(...args))
  ipcRenderer.on('wt-file-modtimes', (e, ...args) => tc.torrentFileModtimes(...args))
  ipcRenderer.on('wt-file-saved', (e, ...args) => tc.torrentFileSaved(...args))
  ipcRenderer.on('wt-poster', (e, ...args) => tc.torrentPosterSaved(...args))
  ipcRenderer.on('wt-audio-metadata', (e, ...args) => tc.torrentAudioMetadata(...args))
  ipcRenderer.on('wt-server-running', (e, ...args) => tc.torrentServerRunning(...args))

  ipcRenderer.on('wt-uncaught-error', (e, err) => telemetry.logUncaughtError('webtorrent', err))

  ipcRenderer.send('ipcReady')

  State.on('savedState', () => ipcRenderer.send('savedState'))
}

// Quits any modal popovers and returns to the torrent list screen
function backToList () {
  // Exit any modals and screens with a back button
  state.modal = null
  state.location.backToFirst(function () {
    // If we were already on the torrent list, scroll to the top
    var contentTag = document.querySelector('.content')
    if (contentTag) contentTag.scrollTop = 0

    // TODO dcposch: is this still required with React?
    // Work around virtual-dom issue: it doesn't expose its redraw function,
    // and only redraws on requestAnimationFrame(). That means when the user
    // closes the window (hide window / minimize to tray) and we want to pause
    // the video, we update the vdom but it keeps playing until you reopen!
    var mediaTag = document.querySelector('video,audio')
    if (mediaTag) mediaTag.pause()
  })
}

// Quits modals, full screen, or goes back. Happens when the user hits ESC
function escapeBack () {
  if (state.modal) {
    dispatch('exitModal')
  } else if (state.window.isFullScreen) {
    dispatch('toggleFullScreen')
  } else {
    dispatch('back')
  }
}

// Starts all torrents that aren't paused on program startup
function resumeTorrents () {
  state.saved.torrents
    .filter((torrentSummary) => torrentSummary.status !== 'paused')
    .forEach((torrentSummary) => controllers.torrentList.startTorrentingSummary(torrentSummary))
}

// Set window dimensions to match video dimensions or fill the screen
function setDimensions (dimensions) {
  // Don't modify the window size if it's already maximized
  if (electron.remote.getCurrentWindow().isMaximized()) {
    state.window.bounds = null
    return
  }

  // Save the bounds of the window for later. See restoreBounds()
  state.window.bounds = {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight
  }
  state.window.wasMaximized = electron.remote.getCurrentWindow().isMaximized

  // Limit window size to screen size
  var screenWidth = window.screen.width
  var screenHeight = window.screen.height
  var aspectRatio = dimensions.width / dimensions.height
  var scaleFactor = Math.min(
    Math.min(screenWidth / dimensions.width, 1),
    Math.min(screenHeight / dimensions.height, 1)
  )
  var width = Math.max(
    Math.floor(dimensions.width * scaleFactor),
    config.WINDOW_MIN_WIDTH
  )
  var height = Math.max(
    Math.floor(dimensions.height * scaleFactor),
    config.WINDOW_MIN_HEIGHT
  )

  ipcRenderer.send('setAspectRatio', aspectRatio)
  ipcRenderer.send('setBounds', {x: null, y: null, width, height})
  state.playing.aspectRatio = aspectRatio
}

// Called when the user adds files (.torrent, files to seed, subtitles) to the app
// via any method (drag-drop, drag to app icon, command line)
function onOpen (files) {
  if (!Array.isArray(files)) files = [ files ]

  if (state.modal) {
    state.modal = null
  }

  var subtitles = files.filter(controllers.subtitles.isSubtitle)

  if (state.location.url() === 'home' || subtitles.length === 0) {
    if (files.every(TorrentPlayer.isTorrent)) {
      if (state.location.url() !== 'home') {
        backToList()
      }
      // All .torrent files? Add them.
      files.forEach((file) => controllers.torrentList.addTorrent(file))
    } else {
      // Show the Create Torrent screen. Let's seed those files.
      controllers.torrentList.showCreateTorrent(files)
    }
  } else if (state.location.url() === 'player') {
    controllers.subtitles.addSubtitles(subtitles, true)
  }

  update()
}

function onError (err) {
  console.error(err.stack || err)
  sound.play('ERROR')
  state.errors.push({
    time: new Date().getTime(),
    message: err.message || err
  })

  update()
}

function onPaste (e) {
  if (e.target.tagName.toLowerCase() === 'input') return

  var torrentIds = electron.clipboard.readText().split('\n')
  torrentIds.forEach(function (torrentId) {
    torrentId = torrentId.trim()
    if (torrentId.length === 0) return
    controllers.torrentList.addTorrent(torrentId)
  })

  update()
}

function onFocus (e) {
  state.window.isFocused = true
  state.dock.badge = 0
  update()
}

function onBlur () {
  state.window.isFocused = false
  update()
}

function onVisibilityChange () {
  state.window.isVisible = !document.webkitHidden
}

function onFullscreenChanged (e, isFullScreen) {
  state.window.isFullScreen = isFullScreen
  if (!isFullScreen) {
    // Aspect ratio gets reset in fullscreen mode, so restore it (OS X)
    ipcRenderer.send('setAspectRatio', state.playing.aspectRatio)
  }

  update()
}
