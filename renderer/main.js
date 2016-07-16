console.time('init')

const crashReporter = require('../crash-reporter')
crashReporter.init()

const dragDrop = require('drag-drop')
const electron = require('electron')
const mainLoop = require('main-loop')
const path = require('path')

const createElement = require('virtual-dom/create-element')
const diff = require('virtual-dom/diff')
const patch = require('virtual-dom/patch')

const config = require('../config')
const App = require('./views/app')
const telemetry = require('./lib/telemetry')
const sound = require('./lib/sound')
const State = require('./lib/state')
const TorrentPlayer = require('./lib/torrent-player')
const TorrentSummary = require('./lib/torrent-summary')

const MediaController = require('./controllers/media-controller')
const UpdateController = require('./controllers/update-controller')
const PrefsController = require('./controllers/prefs-controller')
const TorrentListController = require('./controllers/torrent-list-controller')
const PlaybackController = require('./controllers/playback-controller')
const SubtitlesController = require('./controllers/subtitles-controller')

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
var state, vdomLoop

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
    torrentList: new TorrentListController(state),
    playback: new PlaybackController(state, config, update),
    subtitles: new SubtitlesController(state)
  }

  // Add first page to location history
  state.location.go({ url: 'home' })

  // Restart everything we were torrenting last time the app ran
  resumeTorrents()

  // Lazy-load other stuff, like the AppleTV module, later to keep startup fast
  window.setTimeout(delayedInit, config.DELAYED_INIT)

  // The UI is built with virtual-dom, a minimalist library extracted from React
  // The concepts--one way data flow, a pure function that renders state to a
  // virtual DOM tree, and a diff that applies changes in the vdom to the real
  // DOM, are all the same. Learn more: https://facebook.github.io/react/
  vdomLoop = mainLoop(state, render, {
    create: createElement,
    diff: diff,
    patch: patch
  })
  document.body.appendChild(vdomLoop.target)

  // Listen for messages from the main process
  setupIpc()

  // Calling update() updates the UI given the current state
  // Do this at least once a second to give every file in every torrentSummary
  // a progress bar and to keep the cursor in sync when playing a video
  setInterval(update, 1000)

  // OS integrations:
  // ...drag and drop a torrent or video file to play or seed
  dragDrop('body', onOpen)

  // ...same thing if you paste a torrent
  document.addEventListener('paste', onPaste)

  // ...focus and blur. Needed to show correct dock icon text ("badge") in OSX
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

// This is the (mostly) pure function from state -> UI. Returns a virtual DOM
// tree. Any events, such as button clicks, will turn into calls to dispatch()
function render (state) {
  try {
    return App(state)
  } catch (e) {
    console.log('rendering error: %s\n\t%s', e.message, e.stack)
  }
}

// Calls render() to go from state -> UI, then applies to vdom to the real DOM.
function update () {
  controllers.playback.showOrHidePlayerControls()
  vdomLoop.update(state)
  updateElectron()
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
  'saveState': () => State.save(state)
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

  // Update the virtual-dom, unless it's just a mouse move event
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

  ipcRenderer.on('wt-infohash', (e, ...args) => torrentInfoHash(...args))
  ipcRenderer.on('wt-metadata', (e, ...args) => torrentMetadata(...args))
  ipcRenderer.on('wt-done', (e, ...args) => torrentDone(...args))
  ipcRenderer.on('wt-warning', (e, ...args) => torrentWarning(...args))
  ipcRenderer.on('wt-error', (e, ...args) => torrentError(...args))

  ipcRenderer.on('wt-progress', (e, ...args) => torrentProgress(...args))
  ipcRenderer.on('wt-file-modtimes', (e, ...args) => torrentFileModtimes(...args))
  ipcRenderer.on('wt-file-saved', (e, ...args) => torrentFileSaved(...args))
  ipcRenderer.on('wt-poster', (e, ...args) => torrentPosterSaved(...args))
  ipcRenderer.on('wt-audio-metadata', (e, ...args) => torrentAudioMetadata(...args))
  ipcRenderer.on('wt-server-running', (e, ...args) => torrentServerRunning(...args))

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

// Gets a torrent summary {name, infoHash, status} from state.saved.torrents
// Returns undefined if we don't know that infoHash
function getTorrentSummary (torrentKey) {
  return TorrentSummary.getByKey(state, torrentKey)
}

function torrentInfoHash (torrentKey, infoHash) {
  var torrentSummary = getTorrentSummary(torrentKey)
  console.log('got infohash for %s torrent %s',
    torrentSummary ? 'existing' : 'new', torrentKey)

  if (!torrentSummary) {
    // Check if an existing (non-active) torrent has the same info hash
    if (state.saved.torrents.find((t) => t.infoHash === infoHash)) {
      ipcRenderer.send('wt-stop-torrenting', infoHash)
      return onError(new Error('Cannot add duplicate torrent'))
    }

    torrentSummary = {
      torrentKey: torrentKey,
      status: 'new'
    }
    state.saved.torrents.unshift(torrentSummary)
    sound.play('ADD')
  }

  torrentSummary.infoHash = infoHash
  update()
}

function torrentWarning (torrentKey, message) {
  onWarning(message)
}

function torrentError (torrentKey, message) {
  // TODO: WebTorrent needs semantic errors
  if (message.startsWith('Cannot add duplicate torrent')) {
    // Remove infohash from the message
    message = 'Cannot add duplicate torrent'
  }
  onError(message)

  var torrentSummary = getTorrentSummary(torrentKey)
  if (torrentSummary) {
    console.log('Pausing torrent %s due to error: %s', torrentSummary.infoHash, message)
    torrentSummary.status = 'paused'
    update()
  }
}

function torrentMetadata (torrentKey, torrentInfo) {
  // Summarize torrent
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.status = 'downloading'
  torrentSummary.name = torrentSummary.displayName || torrentInfo.name
  torrentSummary.path = torrentInfo.path
  torrentSummary.magnetURI = torrentInfo.magnetURI
  // TODO: make torrentInfo immutable, save separately as torrentSummary.info
  // For now, check whether torrentSummary.files has already been set:
  var hasDetailedFileInfo = torrentSummary.files && torrentSummary.files[0].path
  if (!hasDetailedFileInfo) {
    torrentSummary.files = torrentInfo.files
  }
  if (!torrentSummary.selections) {
    torrentSummary.selections = torrentSummary.files.map((x) => true)
  }
  torrentSummary.defaultPlayFileIndex = TorrentPlayer.pickFileToPlay(torrentInfo.files)
  update()

  // Save the .torrent file, if it hasn't been saved already
  if (!torrentSummary.torrentFileName) ipcRenderer.send('wt-save-torrent-file', torrentKey)

  // Auto-generate a poster image, if it hasn't been generated already
  if (!torrentSummary.posterFileName) ipcRenderer.send('wt-generate-torrent-poster', torrentKey)
}

function torrentDone (torrentKey, torrentInfo) {
  // Update the torrent summary
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.status = 'seeding'

  // Notify the user that a torrent finished, but only if we actually DL'd at least part of it.
  // Don't notify if we merely finished verifying data files that were already on disk.
  if (torrentInfo.bytesReceived > 0) {
    if (!state.window.isFocused) {
      state.dock.badge += 1
    }
    showDoneNotification(torrentSummary)
    ipcRenderer.send('downloadFinished', getTorrentPath(torrentSummary))
  }

  update()
}

function torrentProgress (progressInfo) {
  // Overall progress across all active torrents, 0 to 1
  var progress = progressInfo.progress
  var hasActiveTorrents = progressInfo.hasActiveTorrents

  // Hide progress bar when client has no torrents, or progress is 100%
  // TODO: isn't this equivalent to: if (progress === 1) ?
  if (!hasActiveTorrents || progress === 1) {
    progress = -1
  }

  // Show progress bar under the WebTorrent taskbar icon, on OSX
  state.dock.progress = progress

  // Update progress for each individual torrent
  progressInfo.torrents.forEach(function (p) {
    var torrentSummary = getTorrentSummary(p.torrentKey)
    if (!torrentSummary) {
      console.log('warning: got progress for missing torrent %s', p.torrentKey)
      return
    }
    torrentSummary.progress = p
  })

  // TODO: Find an efficient way to re-enable this line, which allows subtitle
  //       files which are completed after a video starts to play to be added
  //       dynamically to the list of subtitles.
  // checkForSubtitles()

  update()
}

function torrentFileModtimes (torrentKey, fileModtimes) {
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.fileModtimes = fileModtimes
  State.saveThrottled(state)
}

function torrentFileSaved (torrentKey, torrentFileName) {
  console.log('torrent file saved %s: %s', torrentKey, torrentFileName)
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.torrentFileName = torrentFileName
  State.saveThrottled(state)
}

function torrentPosterSaved (torrentKey, posterFileName) {
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.posterFileName = posterFileName
  State.saveThrottled(state)
}

function torrentAudioMetadata (infoHash, index, info) {
  var torrentSummary = getTorrentSummary(infoHash)
  var fileSummary = torrentSummary.files[index]
  fileSummary.audioInfo = info
  update()
}

function torrentServerRunning (serverInfo) {
  state.server = serverInfo
}

function getTorrentPath (torrentSummary) {
  var itemPath = path.join(torrentSummary.path, torrentSummary.files[0].path)
  if (torrentSummary.files.length > 1) {
    itemPath = path.dirname(itemPath)
  }
  return itemPath
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

function showDoneNotification (torrent) {
  var notif = new window.Notification('Download Complete', {
    body: torrent.name,
    silent: true
  })

  notif.onclick = function () {
    ipcRenderer.send('show')
  }

  sound.play('DONE')
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

function onWarning (err) {
  console.log('warning: %s', err.message || err)
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
