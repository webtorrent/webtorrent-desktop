console.time('init')

var cfg = require('application-config')('WebTorrent')
var dragDrop = require('drag-drop')
var electron = require('electron')
var EventEmitter = require('events')
var fs = require('fs')
var mainLoop = require('main-loop')
var path = require('path')
var remote = require('remote')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')
var errors = require('./lib/errors')
var config = require('../config')
var crashReporter = require('../crash-reporter')
var TorrentPlayer = require('./lib/torrent-player')
var util = require('./util')
var {setDispatch} = require('./lib/dispatcher')
setDispatch(dispatch)
var State = require('./state')

// This dependency is the slowest-loading, so we lazy load it
var Cast = null

// Electron apps have two processes: a main process (node) runs first and starts
// a renderer process (essentially a Chrome window). We're in the renderer process,
// and this IPC channel receives from and sends messages to the main process
var ipcRenderer = electron.ipcRenderer

var clipboard = electron.clipboard
var dialog = remote.require('dialog')

// For easy debugging in Developer Tools
var state = global.state = State.getInitialState()

var vdomLoop

// Report crashes back to our server.
// Not global JS exceptions, not like Rollbar, handles segfaults/core dumps only
crashReporter.init()

// All state lives in state.js. `state.saved` is read from and written to a file.
// All other state is ephemeral. First we load state.saved then initialize the app.
loadState(init)

/**
 * Called once when the application loads. (Not once per window.)
 * Connects to the torrent networks, sets up the UI and OS integrations like
 * the dock icon and drag+drop.
 */
function init () {
  // Push the first page into the location history
  state.location.go({ url: 'home' })

  initWebTorrent()

  // Lazily load the Chromecast/Airplay/DLNA modules
  window.setTimeout(lazyLoadCast, 5000)

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

  // OS integrations:
  // ...drag and drop a torrent or video file to play or seed
  dragDrop('body', (files) => dispatch('onOpen', files))

  // ...same thing if you paste a torrent
  document.addEventListener('paste', onPaste)

  // ...keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.which === 27) { /* ESC means either exit fullscreen or go back */
      if (state.modal) {
        dispatch('exitModal')
      } else if (state.window.isFullScreen) {
        dispatch('toggleFullScreen')
      } else {
        dispatch('back')
      }
    } else if (e.which === 32) { /* spacebar pauses or plays the video */
      dispatch('playPause')
    } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.which === 39) {
      dispatch('playbackJump', state.playing.currentTime + 10)
    } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.which === 37) {
      dispatch('playbackJump', state.playing.currentTime - 10)
    } else if ((e.ctrlKey || e.metaKey) && (e.which === 107 || (e.which === 187 && e.shiftKey))) { /* CMD || CTRL + "+"   */
      dispatch('setPlaybackRate', 1)
    } else if ((e.ctrlKey || e.metaKey) && (e.which === 109 || e.which === 189)) { /* CMD || CTRL + "-"   */
      dispatch('setPlaybackRate', -1)
    }
  })

  // ...focus and blur. Needed to show correct dock icon text ("badge") in OSX
  window.addEventListener('focus', function () {
    state.window.isFocused = true
    state.dock.badge = 0
    update()
  })

  window.addEventListener('blur', function () {
    state.window.isFocused = false
    update()
  })

  // Listen for messages from the main process
  setupIpc()

  // Done! Ideally we want to get here <100ms after the user clicks the app
  playInterfaceSound('STARTUP')

  console.timeEnd('init')
}

// Lazily loads Chromecast and Airplay support
function lazyLoadCast () {
  if (!Cast) {
    Cast = require('./lib/cast')
    Cast.init(state, update) // Search the local network for Chromecast and Airplays
  }
  return Cast
}

// Talk to WebTorrent process, resume torrents, start monitoring torrent progress
function initWebTorrent () {
  // Restart everything we were torrenting last time the app ran
  resumeTorrents()

  // Calling update() updates the UI given the current state
  // Do this at least once a second to give every file in every torrentSummary
  // a progress bar and to keep the cursor in sync when playing a video
  setInterval(update, 1000)
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
  showOrHidePlayerControls()
  vdomLoop.update(state)
  updateElectron()
}

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

// Events from the UI never modify state directly. Instead they call dispatch()
function dispatch (action, ...args) {
  // Log dispatch calls, for debugging
  if (!['mediaMouseMoved', 'mediaTimeUpdate'].includes(action)) {
    console.log('dispatch: %s %o', action, args)
  }

  if (action === 'onOpen') {
    onOpen(args[0] /* files */)
  }
  if (action === 'addTorrent') {
    addTorrent(args[0] /* torrent */)
  }
  if (action === 'showCreateTorrent') {
    ipcRenderer.send('showCreateTorrent') /* open file or folder to seed */
  }
  if (action === 'showOpenTorrentFile') {
    ipcRenderer.send('showOpenTorrentFile') /* open torrent file */
  }
  if (action === 'createTorrent') {
    createTorrent(args[0] /* options */)
  }
  if (action === 'openFile') {
    openFile(args[0] /* infoHash */, args[1] /* index */)
  }
  if (action === 'openFolder') {
    openFolder(args[0] /* infoHash */)
  }
  if (action === 'toggleTorrent') {
    toggleTorrent(args[0] /* infoHash */)
  }
  if (action === 'deleteTorrent') {
    deleteTorrent(args[0] /* infoHash */)
  }
  if (action === 'toggleSelectTorrent') {
    toggleSelectTorrent(args[0] /* infoHash */)
  }
  if (action === 'openTorrentContextMenu') {
    openTorrentContextMenu(args[0] /* infoHash */)
  }
  if (action === 'openDevice') {
    lazyLoadCast().open(args[0] /* deviceType */)
  }
  if (action === 'closeDevice') {
    lazyLoadCast().close()
  }
  if (action === 'setDimensions') {
    setDimensions(args[0] /* dimensions */)
  }
  if (action === 'back') {
    state.location.back()
  }
  if (action === 'forward') {
    state.location.forward()
  }
  if (action === 'playPause') {
    playPause()
  }
  if (action === 'play') {
    if (state.location.pending()) return
    state.location.go({
      url: 'player',
      onbeforeload: function (cb) {
        openPlayer(args[0] /* infoHash */, args[1] /* index */, cb)
      },
      onbeforeunload: closePlayer
    })
    playPause(false)
  }
  if (action === 'pause') {
    playPause(true)

    // Work around virtual-dom issue: it doesn't expose its redraw function,
    // and only redraws on requestAnimationFrame(). That means when the user
    // closes the window (hide window / minimize to tray) and we want to pause
    // the video, we update the vdom but it keeps playing until you reopen!
    var mediaTag = document.querySelector('video,audio')
    if (mediaTag) mediaTag.pause()
  }
  if (action === 'playbackJump') {
    jumpToTime(args[0] /* seconds */)
  }
  if (action === 'setPlaybackRate') {
    setPlaybackRate(args[0] /* seconds */)
  }
  if (action === 'changeVolume') {
    changeVolume(args[0] /* increase */)
  }
  if (action === 'setVolume') {
    setVolume(args[0] /* increase */)
  }
  if (action === 'mediaPlaying') {
    state.playing.isPaused = false
    ipcRenderer.send('blockPowerSave')
  }
  if (action === 'mediaPaused') {
    state.playing.isPaused = true
    ipcRenderer.send('unblockPowerSave')
  }
  if (action === 'mediaStalled') {
    state.playing.isStalled = true
  }
  if (action === 'mediaTimeUpdate') {
    state.playing.lastTimeUpdate = new Date().getTime()
    state.playing.isStalled = false
  }
  if (action === 'toggleFullScreen') {
    ipcRenderer.send('toggleFullScreen', args[0] /* optional bool */)
  }
  if (action === 'mediaMouseMoved') {
    state.playing.mouseStationarySince = new Date().getTime()
  }
  if (action === 'exitModal') {
    state.modal = null
  }
  if (action === 'updateAvailable') {
    updateAvailable(args[0] /* version */)
  }
  if (action === 'skipVersion') {
    if (!state.saved.skippedVersions) state.saved.skippedVersions = []
    state.saved.skippedVersions.push(args[0] /* version */)
    saveStateThrottled()
  }
  if (action === 'saveState') {
    saveState()
  }

  // Update the virtual-dom, unless it's just a mouse move event
  if (action !== 'mediaMouseMoved' || showOrHidePlayerControls()) {
    update()
  }
}

// Shows a modal saying that we have an update
function updateAvailable (version) {
  if (state.saved.skippedVersions && state.saved.skippedVersions.includes(version)) {
    console.log('new version skipped by user: v' + version)
    return
  }
  state.modal = { id: 'update-available-modal', version: version }
}

// Plays or pauses the video. If isPaused is undefined, acts as a toggle
function playPause (isPaused) {
  if (isPaused === state.playing.isPaused) {
    return // Nothing to do
  }
  // Either isPaused is undefined, or it's the opposite of the current state. Toggle.
  if (isCasting()) {
    Cast.playPause()
  }
  state.playing.isPaused = !state.playing.isPaused
}

function jumpToTime (time) {
  if (isCasting()) {
    Cast.seek(time)
  } else {
    state.playing.jumpToTime = time
  }
}
function setPlaybackRate (direction) {
  var rate = state.playing.playbackRate
  if ((direction > 0 && rate >= 1 && rate < 16) || (direction < 0 && rate > -16 && rate <= -1)) {
    rate *= 2
  } else if ((direction < 0 && rate > 1 && rate <= 16) || (direction > 0 && rate >= -16 && rate < -1)) {
    rate /= 2
  } else if (rate === -1 || rate === 1) {
    rate *= -1
  }
  state.playing.playbackRate = rate
  if (lazyLoadCast().isCasting()) {
    Cast.setRate(rate)
  }
}
function changeVolume (delta) {
  // change volume with delta value
  setVolume(state.playing.volume + delta)
}

// TODO: never called. Either remove or make a volume control that calls it
function setVolume (volume) {
  // check if its in [0.0 - 1.0] range
  volume = Math.max(0, Math.min(1, volume))
  if (isCasting()) {
    Cast.setVolume(volume)
  } else {
    state.playing.setVolume = volume
  }
}

// Checks whether we are connected and already casting
// Returns false if we not casting (state.playing.location === 'local')
// or if we're trying to connect but haven't yet ('chromecast-pending', etc)
function isCasting () {
  return state.playing.location === 'chromecast' ||
    state.playing.location === 'airplay' ||
    state.playing.location === 'dlna'
}

function setupIpc () {
  ipcRenderer.send('ipcReady')

  ipcRenderer.on('log', (e, ...args) => console.log(...args))
  ipcRenderer.on('error', (e, ...args) => console.error(...args))

  ipcRenderer.on('dispatch', (e, ...args) => dispatch(...args))

  ipcRenderer.on('showOpenTorrentAddress', function (e) {
    state.modal = { id: 'open-torrent-address-modal' }
    update()
  })

  ipcRenderer.on('fullscreenChanged', function (e, isFullScreen) {
    state.window.isFullScreen = isFullScreen
    update()
  })

  ipcRenderer.on('addFakeDevice', function (e, device) {
    var player = new EventEmitter()
    player.play = (networkURL) => console.log(networkURL)
    state.devices[device] = player
    update()
  })

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
}

// Load state.saved from the JSON state file
function loadState (cb) {
  cfg.read(function (err, data) {
    if (err) console.error(err)
    console.log('loaded state from ' + cfg.filePath)

    // populate defaults if they're not there
    state.saved = Object.assign({}, State.getDefaultSavedState(), data)
    state.saved.torrents.forEach(function (torrentSummary) {
      if (torrentSummary.displayName) torrentSummary.name = torrentSummary.displayName
    })

    if (cb) cb()
  })
}

// Starts all torrents that aren't paused on program startup
function resumeTorrents () {
  state.saved.torrents
    .filter((x) => x.status !== 'paused')
    .forEach((x) => startTorrentingSummary(x))
}

// Don't write state.saved to file more than once a second
function saveStateThrottled () {
  if (state.saveStateTimeout) return
  state.saveStateTimeout = setTimeout(function () {
    delete state.saveStateTimeout
    saveState()
  }, 1000)
}

// Write state.saved to the JSON state file
function saveState () {
  console.log('saving state to ' + cfg.filePath)

  // Clean up, so that we're not saving any pending state
  var copy = Object.assign({}, state.saved)
  // Remove torrents pending addition to the list, where we haven't finished
  // reading the torrent file or file(s) to seed & don't have an infohash
  copy.torrents = copy.torrents
    .filter((x) => x.infoHash)
    .map(function (x) {
      var torrent = {}
      for (var key in x) {
        if (key === 'progress' || key === 'torrentKey') {
          continue // Don't save progress info or key for the webtorrent process
        }
        if (key === 'playStatus' && x.playStatus !== 'unplayable') {
          continue // Don't save whether a torrent is playing / pending
        }
        torrent[key] = x[key]
      }
      return torrent
    })

  cfg.write(copy, function (err) {
    if (err) console.error(err)
    ipcRenderer.send('savedState')
  })

  // Update right away, don't wait for the state to save
  update()
}

function onOpen (files) {
  if (!Array.isArray(files)) files = [ files ]

  // .torrent file = start downloading the torrent
  files.filter(isTorrent).forEach(function (torrentFile) {
    addTorrent(torrentFile)
  })

  // everything else = seed these files
  createTorrentFromFileObjects(files.filter(isNotTorrent))
}

function onPaste (e) {
  if (e.target.tagName.toLowerCase() === 'input') return

  var torrentIds = clipboard.readText().split('\n')
  torrentIds.forEach(function (torrentId) {
    torrentId = torrentId.trim()
    if (torrentId.length === 0) return
    dispatch('addTorrent', torrentId)
  })
}

function isTorrent (file) {
  var name = typeof file === 'string' ? file : file.name
  var isTorrentFile = path.extname(name).toLowerCase() === '.torrent'
  var isMagnet = typeof file === 'string' && /^magnet:/.test(file)
  return isTorrentFile || isMagnet
}

function isNotTorrent (file) {
  return !isTorrent(file)
}

// Gets a torrent summary {name, infoHash, status} from state.saved.torrents
// Returns undefined if we don't know that infoHash
function getTorrentSummary (torrentKey) {
  if (!torrentKey) return undefined
  return state.saved.torrents.find((x) =>
    x.torrentKey === torrentKey || x.infoHash === torrentKey)
}

// Adds a torrent to the list, starts downloading/seeding. TorrentID can be a
// magnet URI, infohash, or torrent file: https://github.com/feross/webtorrent#clientaddtorrentid-opts-function-ontorrent-torrent-
function addTorrent (torrentId) {
  var torrentKey = state.nextTorrentKey++
  var path = state.saved.downloadPath
  if (torrentId.path) {
    // Use path string instead of W3C File object
    torrentId = torrentId.path
  }
  ipcRenderer.send('wt-start-torrenting', torrentKey, torrentId, path)
}

// Starts downloading and/or seeding a given torrentSummary. Returns WebTorrent object
function startTorrentingSummary (torrentSummary) {
  var s = torrentSummary

  // Backward compatibility for config files save before we had torrentKey
  if (!s.torrentKey) s.torrentKey = state.nextTorrentKey++

  // Use Downloads folder by default
  var path = s.path || state.saved.downloadPath

  var torrentID
  if (s.torrentPath) { // Load torrent file from disk
    torrentID = util.getAbsoluteStaticPath(s.torrentPath)
  } else { // Load torrent from DHT
    torrentID = s.magnetURI || s.infoHash
  }

  ipcRenderer.send('wt-start-torrenting', s.torrentKey, torrentID, path, s.fileModtimes)
}

// TODO: maybe have a "create torrent" modal in the future, with options like
// custom trackers, private flag, and so on?
//
// Right now create-torrent-modal is v basic, only user input is OK / Cancel
//
// Also, if you uncomment below below, creating a torrent thru
// File > Create New Torrent will still create a new torrent directly, while
// dragging files or folders onto the app opens the create-torrent-modal
//
// That's because the former gets a single string and the latter gets a list
// of W3C File objects. We should fix this inconsistency, ideally without
// duping this code in the drag-drop module:
// https://github.com/feross/drag-drop/blob/master/index.js
//
// function showCreateTorrentModal (files) {
//   if (files.length === 0) return
//   state.modal = {
//     id: 'create-torrent-modal',
//     files: files
//   }
// }

//
// TORRENT MANAGEMENT
// Send commands to the WebTorrent process, handle events
//

// Creates a new torrent from a drag-dropped file or folder
function createTorrentFromFileObjects (files) {
  var filePaths = files.map((x) => x.path)

  // Single-file torrents are easy. Multi-file torrents require special handling
  // make sure WebTorrent seeds all files in place, without copying to /tmp
  if (filePaths.length === 1) {
    return createTorrent({files: filePaths[0]})
  }

  // First, extract the base folder that the files are all in
  var pathPrefix = files.map((x) => x.path).reduce(findCommonPrefix)
  if (files.length > 0 && !pathPrefix.endsWith('/') && !pathPrefix.endsWith('\\')) {
    pathPrefix = path.dirname(pathPrefix)
  }

  // Then, use the name of the base folder (or sole file, for a single file torrent)
  // as the default name. Show all files relative to the base folder.
  var defaultName = path.basename(pathPrefix)
  var basePath = path.dirname(pathPrefix)
  var options = {
    // TODO: we can't let the user choose their own name if we want WebTorrent
    // to use the files in place rather than creating a new folder.
    name: defaultName,
    path: basePath,
    files: filePaths
  }

  createTorrent(options)
}

// Creates a new torrent and start seeeding
function createTorrent (options) {
  var torrentKey = state.nextTorrentKey++
  ipcRenderer.send('wt-create-torrent', torrentKey, options)
}

function torrentInfoHash (torrentKey, infoHash) {
  var torrentSummary = getTorrentSummary(torrentKey)
  console.log('got infohash for %s torrent %s',
    torrentSummary ? 'existing' : 'new', torrentKey)

  if (!torrentSummary) {
    torrentSummary = {
      torrentKey: torrentKey,
      status: 'new'
    }
    state.saved.torrents.push(torrentSummary)
    playInterfaceSound('ADD')
  }

  torrentSummary.infoHash = infoHash
  update()
}

function torrentWarning (torrentKey, message) {
  onWarning(message)
}

function torrentError (torrentKey, message) {
  var torrentSummary = getTorrentSummary(torrentKey)

  // TODO: WebTorrent should have semantic errors
  if (message.startsWith('There is already a swarm')) {
    onError(new Error('Couldn\'t add duplicate torrent'))
  } else if (!torrentSummary) {
    onError(message)
  } else {
    console.log('error, stopping torrent %s (%s):\n\t%o',
      torrentSummary.name, torrentSummary.infoHash, message)
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
  torrentSummary.files = torrentInfo.files
  torrentSummary.magnetURI = torrentInfo.magnetURI
  update()

  // Save the .torrent file, if it hasn't been saved already
  if (!torrentSummary.torrentPath) ipcRenderer.send('wt-save-torrent-file', torrentKey)

  // Auto-generate a poster image, if it hasn't been generated already
  if (!torrentSummary.posterURL) ipcRenderer.send('wt-generate-torrent-poster', torrentKey)
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

  update()
}

function torrentFileModtimes (torrentKey, fileModtimes) {
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.fileModtimes = fileModtimes
  saveStateThrottled()
}

function torrentFileSaved (torrentKey, torrentPath) {
  console.log('torrent file saved %s: %s', torrentKey, torrentPath)
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.torrentPath = torrentPath
  saveStateThrottled()
}

function torrentPosterSaved (torrentKey, posterPath) {
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.posterURL = posterPath
  saveStateThrottled()
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

// Picks the default file to play from a list of torrent or torrentSummary files
// Returns an index or undefined, if no files are playable
function pickFileToPlay (files) {
  // first, try to find the biggest video file
  var videoFiles = files.filter(TorrentPlayer.isVideo)
  if (videoFiles.length > 0) {
    var largestVideoFile = videoFiles.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    return files.indexOf(largestVideoFile)
  }

  // if there are no videos, play the first audio file
  var audioFiles = files.filter(TorrentPlayer.isAudio)
  if (audioFiles.length > 0) {
    return files.indexOf(audioFiles[0])
  }

  // no video or audio means nothing is playable
  return undefined
}

function stopServer () {
  ipcRenderer.send('wt-stop-server')
  state.playing = State.getDefaultPlayState()
  state.server = null
}

// Opens the video player
function openPlayer (infoHash, index, cb) {
  var torrentSummary = getTorrentSummary(infoHash)

  // automatically choose which file in the torrent to play, if necessary
  if (index === undefined) index = pickFileToPlay(torrentSummary.files)
  if (index === undefined) return cb(new errors.UnplayableError())

  // update UI to show pending playback
  if (torrentSummary.progress !== 1) playInterfaceSound('PLAY')
  torrentSummary.playStatus = 'requested'
  update()

  var timeout = setTimeout(function () {
    torrentSummary.playStatus = 'timeout' /* no seeders available? */
    playInterfaceSound('ERROR')
    cb(new Error('playback timed out'))
    update()
  }, 10000) /* give it a few seconds */

  if (torrentSummary.status === 'paused') {
    startTorrentingSummary(torrentSummary)
    ipcRenderer.once('wt-ready-' + torrentSummary.infoHash,
      () => openPlayerFromActiveTorrent(torrentSummary, index, timeout, cb))
  } else {
    openPlayerFromActiveTorrent(torrentSummary, index, timeout, cb)
  }
}

function openPlayerFromActiveTorrent (torrentSummary, index, timeout, cb) {
  var fileSummary = torrentSummary.files[index]

  // update state
  state.playing.infoHash = torrentSummary.infoHash
  state.playing.fileIndex = index
  state.playing.type = TorrentPlayer.isVideo(fileSummary) ? 'video'
    : TorrentPlayer.isAudio(fileSummary) ? 'audio'
    : 'other'

  // if it's audio, parse out the metadata (artist, title, etc)
  if (state.playing.type === 'audio' && !fileSummary.audioInfo) {
    ipcRenderer.send('wt-get-audio-metadata', torrentSummary.infoHash, index)
  }

  ipcRenderer.send('wt-start-server', torrentSummary.infoHash, index)
  ipcRenderer.once('wt-server-' + torrentSummary.infoHash, function (e, info) {
    clearTimeout(timeout)

    // if we timed out (user clicked play a long time ago), don't autoplay
    var timedOut = torrentSummary.playStatus === 'timeout'
    delete torrentSummary.playStatus
    if (timedOut) {
      ipcRenderer.send('wt-stop-server')
      return update()
    }

    // otherwise, play the video
    state.window.title = torrentSummary.files[state.playing.fileIndex].name
    update()

    ipcRenderer.send('onPlayerOpen')

    cb()
  })
}

function closePlayer (cb) {
  state.window.title = config.APP_WINDOW_TITLE
  update() /* needed for OSX: toggleFullScreen animation w/ correct title */

  if (isCasting()) {
    Cast.close()
  }

  if (state.window.isFullScreen) {
    dispatch('toggleFullScreen', false)
  }
  restoreBounds()
  stopServer()
  update()

  ipcRenderer.send('unblockPowerSave')
  ipcRenderer.send('onPlayerClose')

  cb()
}

function openFile (infoHash, index) {
  var torrentSummary = getTorrentSummary(infoHash)
  var filePath = path.join(
    torrentSummary.path,
    torrentSummary.files[index].path)
  ipcRenderer.send('openItem', filePath)
}

function openFolder (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)

  var firstFilePath = path.join(
    torrentSummary.path,
    torrentSummary.files[0].path)
  var folderPath = path.dirname(firstFilePath)

  ipcRenderer.send('openItem', folderPath)
}

// TODO: use torrentKey, not infoHash
function toggleTorrent (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)
  if (torrentSummary.status === 'paused') {
    torrentSummary.status = 'new'
    startTorrentingSummary(torrentSummary)
    playInterfaceSound('ENABLE')
  } else {
    torrentSummary.status = 'paused'
    ipcRenderer.send('wt-stop-torrenting', torrentSummary.infoHash)
    playInterfaceSound('DISABLE')
  }
}

// TODO: use torrentKey, not infoHash
function deleteTorrent (infoHash) {
  ipcRenderer.send('wt-stop-torrenting', infoHash)

  var index = state.saved.torrents.findIndex((x) => x.infoHash === infoHash)
  if (index > -1) state.saved.torrents.splice(index, 1)
  saveStateThrottled()
  state.location.clearForward() // prevent user from going forward to a deleted torrent
  playInterfaceSound('DELETE')
}

function toggleSelectTorrent (infoHash) {
  // toggle selection
  state.selectedInfoHash = state.selectedInfoHash === infoHash ? null : infoHash
  update()
}

function openTorrentContextMenu (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)
  var menu = new remote.Menu()
  menu.append(new remote.MenuItem({
    label: 'Save Torrent File As...',
    click: () => saveTorrentFileAs(torrentSummary)
  }))

  menu.append(new remote.MenuItem({
    label: 'Copy Instant.io Link to Clipboard',
    click: () => clipboard.writeText(`https://instant.io/#${torrentSummary.infoHash}`)
  }))

  menu.append(new remote.MenuItem({
    label: 'Copy Magnet Link to Clipboard',
    click: () => clipboard.writeText(torrentSummary.magnetURI)
  }))

  menu.popup(remote.getCurrentWindow())
}

function saveTorrentFileAs (torrentSummary) {
  var newFileName = `${path.parse(torrentSummary.name).name}.torrent`
  var opts = {
    title: 'Save Torrent File',
    defaultPath: path.join(state.saved.downloadPath, newFileName),
    filters: [
      { name: 'Torrent Files', extensions: ['torrent'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }
  dialog.showSaveDialog(remote.getCurrentWindow(), opts, (savePath) => {
    var torrentPath = util.getAbsoluteStaticPath(torrentSummary.torrentPath)
    fs.readFile(torrentPath, function (err, torrentFile) {
      if (err) return onError(err)
      fs.writeFile(savePath, torrentFile, function (err) {
        if (err) return onError(err)
      })
    })
  })
}

// Set window dimensions to match video dimensions or fill the screen
function setDimensions (dimensions) {
  // Don't modify the window size if it's already maximized
  if (remote.getCurrentWindow().isMaximized()) {
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
  state.window.wasMaximized = remote.getCurrentWindow().isMaximized

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

  // Center window on screen
  var x = Math.floor((screenWidth - width) / 2)
  var y = Math.floor((screenHeight - height) / 2)

  ipcRenderer.send('setAspectRatio', aspectRatio)
  ipcRenderer.send('setBounds', {x, y, width, height})
}

function restoreBounds () {
  ipcRenderer.send('setAspectRatio', 0)
  if (state.window.bounds) {
    ipcRenderer.send('setBounds', state.window.bounds, false)
  }
}

function onError (err) {
  console.error(err.stack || err)
  playInterfaceSound('ERROR')
  state.errors.push({
    time: new Date().getTime(),
    message: err.message || err
  })
  update()
}

function onWarning (err) {
  console.log('warning: %s', err.message || err)
}

function showDoneNotification (torrent) {
  var notif = new window.Notification('Download Complete', {
    body: torrent.name,
    silent: true
  })

  notif.onclick = function () {
    ipcRenderer.send('focusWindow', 'main')
  }

  playInterfaceSound('DONE')
}

function playInterfaceSound (name) {
  var sound = config[`SOUND_${name}`]
  if (!sound) throw new Error('Invalid sound name')

  var audio = new window.Audio()
  audio.volume = sound.volume
  audio.src = sound.url
  audio.play()
}

// Finds the longest common prefix
function findCommonPrefix (a, b) {
  for (var i = 0; i < a.length && i < b.length; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) break
  }
  if (i === a.length) return a
  if (i === b.length) return b
  return a.substring(0, i)
}

// Hide player controls while playing video, if the mouse stays still for a while
// Never hide the controls when:
// * The mouse is over the controls or we're scrubbing (see CSS)
// * The video is paused
// * The video is playing remotely on Chromecast or Airplay
function showOrHidePlayerControls () {
  var hideControls = state.location.current().url === 'player' &&
    state.playing.mouseStationarySince !== 0 &&
    new Date().getTime() - state.playing.mouseStationarySince > 2000 &&
    !state.playing.isPaused &&
    state.playing.location === 'local'

  if (hideControls !== state.playing.hideControls) {
    state.playing.hideControls = hideControls
    return true
  }
  return false
}
