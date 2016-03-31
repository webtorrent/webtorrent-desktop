console.time('init')

var cfg = require('application-config')('WebTorrent')
var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var electron = require('electron')
var EventEmitter = require('events')
var fs = require('fs')
var mainLoop = require('main-loop')
var mkdirp = require('mkdirp')
var musicmetadata = require('musicmetadata')
var networkAddress = require('network-address')
var path = require('path')
var remote = require('remote')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')
var errors = require('./lib/errors')
var config = require('../config')
var TorrentPlayer = require('./lib/torrent-player')
var torrentPoster = require('./lib/torrent-poster')
var util = require('./util')
var {setDispatch} = require('./lib/dispatcher')
setDispatch(dispatch)

// These two dependencies are the slowest-loading, so we lazy load them
// This cuts time from icon click to rendered window from ~550ms to ~150ms on my laptop
var WebTorrent = null
var Cast = null

// Electron apps have two processes: a main process (node) runs first and starts
// a renderer process (essentially a Chrome window). We're in the renderer process,
// and this IPC channel receives from and sends messages to the main process
var ipcRenderer = electron.ipcRenderer
var clipboard = electron.clipboard
var dialog = remote.require('dialog')

// For easy debugging in Developer Tools
var state = global.state = require('./state')

// Force use of webtorrent trackers on all torrents
global.WEBTORRENT_ANNOUNCE = createTorrent.announceList
  .map((arr) => arr[0])
  .filter((url) => url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0)

var vdomLoop

// All state lives in state.js. `state.saved` is read from and written to a file.
// All other state is ephemeral. First we load state.saved then initialize the app.
loadState(init)

/**
 * Called once when the application loads. (Not once per window.)
 * Connects to the torrent networks, sets up the UI and OS integrations like
 * the dock icon and drag+drop.
 */
function init () {
  state.location.go({ url: 'home' })

  // Lazily load the WebTorrent, Chromecast, and Airplay modules
  window.setTimeout(function () {
    lazyLoadClient()
    lazyLoadCast()
  }, 750)

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

  // Save state on exit
  window.addEventListener('beforeunload', saveState)

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

// Lazily loads the WebTorrent module and creates the WebTorrent client
function lazyLoadClient () {
  if (!WebTorrent) initWebtorrent()
  return state.client
}

// Lazily loads Chromecast and Airplay support
function lazyLoadCast () {
  if (!Cast) {
    Cast = require('./lib/cast')
    Cast.init(update) // Search the local network for Chromecast and Airplays
  }
  return Cast
}

// Load the WebTorrent module, connect to both the WebTorrent and BitTorrent
// networks, resume torrents, start monitoring torrent progress
function initWebtorrent () {
  WebTorrent = require('webtorrent')

  // Connect to the WebTorrent and BitTorrent networks. WebTorrent Desktop is a hybrid
  // client, as explained here: https://webtorrent.io/faq
  state.client = new WebTorrent()
  state.client.on('warning', onWarning)
  state.client.on('error', function (err) {
    // TODO: WebTorrent should have semantic errors
    if (err.message.startsWith('There is already a swarm')) {
      onError(new Error('Couldn\'t add duplicate torrent'))
    } else {
      onError(err)
    }
  })

  // Restart everything we were torrenting last time the app ran
  resumeTorrents()

  // Calling update() updates the UI given the current state
  // Do this at least once a second to give  every file in every torrentSummary
  // a progress bar and to keep the cursor in sync when playing a video
  setInterval(function () {
    if (!updateTorrentProgress()) {
      update() // If we didn't just update(), do so now, for the video cursor
    }
  }, 1000)
}

// This is the (mostly) pure function from state -> UI. Returns a virtual DOM
// tree. Any events, such as button clicks, will turn into calls to dispatch()
function render (state) {
  return App(state)
}

// Calls render() to go from state -> UI, then applies to vdom to the real DOM.
function update () {
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
  if (action !== 'mediaMouseMoved') {
    console.log('dispatch: %s %o', action, args)
  }

  if (action === 'onOpen') {
    onOpen(args[0] /* files */)
  }
  if (action === 'addTorrent') {
    addTorrent(args[0] /* torrent */)
  }
  if (action === 'showCreateTorrent') {
    ipcRenderer.send('showCreateTorrent')
  }
  if (action === 'showOpenTorrentFile') {
    ipcRenderer.send('showOpenTorrentFile')
  }
  if (action === 'seed') {
    seed(args[0] /* files */)
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
  if (action === 'openChromecast') {
    lazyLoadCast().openChromecast()
  }
  if (action === 'openAirplay') {
    lazyLoadCast().openAirplay()
  }
  if (action === 'stopCasting') {
    lazyLoadCast().stopCasting()
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
    var videoTag = document.querySelector('video')
    if (videoTag) videoTag.pause()
  }
  if (action === 'playbackJump') {
    jumpToTime(args[0] /* seconds */)
  }
  if (action === 'changeVolume') {
    changeVolume(args[0] /* increase */)
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
    saveState()
  }

  // Update the virtual-dom, unless it's just a mouse move event
  if (action !== 'mediaMouseMoved') {
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
  if (lazyLoadCast().isCasting()) {
    Cast.playPause()
  }
  state.playing.isPaused = !state.playing.isPaused
}

function jumpToTime (time) {
  if (lazyLoadCast().isCasting()) {
    Cast.seek(time)
  } else {
    state.playing.jumpToTime = time
  }
}

function changeVolume (delta) {
  // change volume with delta value
  setVolume(state.playing.volume + delta)
}

function setVolume (volume) {
  // check if its in [0.0 - 1.0] range
  volume = Math.max(0, Math.min(1, volume))
  if (lazyLoadCast().isCasting()) {
    Cast.setVolume(volume)
  } else {
    state.playing.setVolume = volume
  }
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
}

// Load state.saved from the JSON state file
function loadState (cb) {
  cfg.read(function (err, data) {
    if (err) console.error(err)
    console.log('loaded state from ' + cfg.filePath)

    // populate defaults if they're not there
    state.saved = Object.assign({}, state.defaultSavedState, data)
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

// Write state.saved to the JSON state file
function saveState () {
  console.log('saving state to ' + cfg.filePath)
  cfg.write(state.saved, function (err) {
    if (err) console.error(err)
    update()
  })
}

function onOpen (files) {
  if (!Array.isArray(files)) files = [ files ]

  // .torrent file = start downloading the torrent
  files.filter(isTorrent).forEach(function (torrentFile) {
    addTorrent(torrentFile)
  })

  // everything else = seed these files
  seed(files.filter(isNotTorrent))
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
function getTorrentSummary (infoHash) {
  return state.saved.torrents.find((x) => x.infoHash === infoHash)
}

// Get an active torrent from state.client.torrents
// Returns undefined if we are not currently torrenting that infoHash
function getTorrent (infoHash) {
  var pending = state.pendingTorrents[infoHash]
  if (pending) return pending
  return lazyLoadClient().torrents.find((x) => x.infoHash === infoHash)
}

// Adds a torrent to the list, starts downloading/seeding. TorrentID can be a
// magnet URI, infohash, or torrent file: https://github.com/feross/webtorrent#clientaddtorrentid-opts-function-ontorrent-torrent-
function addTorrent (torrentId) {
  var torrent = startTorrentingID(torrentId)
  torrent.on('infoHash', function () {
    addTorrentToList(torrent)
  })
}

function addTorrentToList (torrent) {
  if (getTorrentSummary(torrent.infoHash)) {
    return // Skip, torrent is already in state.saved
  }

  // If torrentId is a remote torrent (filesystem path, http url, etc.), wait for
  // WebTorrent to finish reading it
  if (torrent.infoHash) onInfoHash()
  else torrent.on('infoHash', onInfoHash)

  function onInfoHash () {
    state.saved.torrents.push({
      status: 'new',
      name: torrent.name,
      infoHash: torrent.infoHash,
      magnetURI: torrent.magnetURI
    })
    saveState()
    playInterfaceSound('ADD')
  }
}

// Starts downloading and/or seeding a given torrentSummary. Returns WebTorrent object
function startTorrentingSummary (torrentSummary) {
  var s = torrentSummary
  if (s.torrentPath) {
    var torrentPath = util.getAbsoluteStaticPath(s.torrentPath)
    var ret = startTorrentingID(torrentPath, s.path)
    if (s.infoHash) state.pendingTorrents[s.infoHash] = ret
    return ret
  } else if (s.magnetURI) {
    return startTorrentingID(s.magnetURI, s.path)
  } else {
    return startTorrentingID(s.infoHash, s.path)
  }
}

// Starts a given TorrentID, which can be an infohash, magnet URI, etc. Returns WebTorrent object
// See https://github.com/feross/webtorrent/blob/master/docs/api.md#clientaddtorrentid-opts-function-ontorrent-torrent-
function startTorrentingID (torrentID, path) {
  console.log('starting torrent ' + torrentID)
  var torrent = lazyLoadClient().add(torrentID, {
    path: path || state.saved.downloadPath // Use downloads folder
  })
  addTorrentEvents(torrent)
  return torrent
}

// Stops downloading and/or seeding
function stopTorrenting (infoHash) {
  var torrent = getTorrent(infoHash)
  if (torrent) torrent.destroy()
}

// Creates a torrent for a local file and starts seeding it
function seed (files) {
  if (files.length === 0) return
  var torrent = lazyLoadClient().seed(files)
  addTorrentToList(torrent)
  addTorrentEvents(torrent)
}

function addTorrentEvents (torrent) {
  torrent.on('infoHash', function () {
    var infoHash = torrent.infoHash
    if (state.pendingTorrents[infoHash]) delete state.pendingTorrents[infoHash]
    update()
  })
  torrent.on('ready', torrentReady)
  torrent.on('done', torrentDone)

  function torrentReady () {
    // Summarize torrent
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    torrentSummary.status = 'downloading'
    torrentSummary.ready = true
    torrentSummary.name = torrentSummary.displayName || torrent.name
    torrentSummary.path = torrent.path

    // Summarize torrent files
    torrentSummary.files = torrent.files.map(summarizeFileInTorrent)
    updateTorrentProgress()

    // Save the .torrent file, if it hasn't been saved already
    if (!torrentSummary.torrentPath) saveTorrentFile(torrentSummary, torrent)

    // Auto-generate a poster image, if it hasn't been generated already
    if (!torrentSummary.posterURL) generateTorrentPoster(torrent, torrentSummary)

    update()
  }

  function torrentDone () {
    // Update the torrent summary
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    torrentSummary.status = 'seeding'
    updateTorrentProgress()

    // Notify the user that a torrent finished, but only if we actually DL'd at least part of it.
    // Don't notify if we merely finished verifying data files that were already on disk.
    if (torrent.received > 0) {
      if (!state.window.isFocused) {
        state.dock.badge += 1
      }
      showDoneNotification(torrent)
    }

    update()
  }
}

function updateTorrentProgress () {
  var changed = false

  // First, track overall progress
  var progress = lazyLoadClient().progress
  var activeTorrentsExist = lazyLoadClient().torrents.some(function (torrent) {
    return torrent.progress !== 1
  })
  // Hide progress bar when client has no torrents, or progress is 100%
  if (!activeTorrentsExist || progress === 1) {
    progress = -1
  }
  // Show progress bar under the WebTorrent taskbar icon, on OSX
  if (state.dock.progress !== progress) changed = true
  state.dock.progress = progress

  // Track progress for every file in each torrentSummary
  // TODO: ideally this would be tracked by WebTorrent, which could do it
  // more efficiently than looping over torrent.bitfield
  lazyLoadClient().torrents.forEach(function (torrent) {
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    if (!torrentSummary || !torrent.ready) return
    torrent.files.forEach(function (file, index) {
      var numPieces = file._endPiece - file._startPiece + 1
      var numPiecesPresent = 0
      for (var piece = file._startPiece; piece <= file._endPiece; piece++) {
        if (torrent.bitfield.get(piece)) numPiecesPresent++
      }

      var fileSummary = torrentSummary.files[index]
      if (fileSummary.numPiecesPresent !== numPiecesPresent || fileSummary.numPieces !== numPieces) {
        fileSummary.numPieces = numPieces
        fileSummary.numPiecesPresent = numPiecesPresent
        changed = true
      }
    })
  })

  if (changed) update()
  return changed
}

function generateTorrentPoster (torrent, torrentSummary) {
  torrentPoster(torrent, function (err, buf, extension) {
    if (err) return onWarning(err)
    // save it for next time
    mkdirp(config.CONFIG_POSTER_PATH, function (err) {
      if (err) return onWarning(err)
      var posterFilePath = path.join(config.CONFIG_POSTER_PATH, torrent.infoHash + extension)
      fs.writeFile(posterFilePath, buf, function (err) {
        if (err) return onWarning(err)
        // show the poster
        torrentSummary.posterURL = posterFilePath
        update()
      })
    })
  })
}

// Produces a JSON saveable summary of a file in a torrent
function summarizeFileInTorrent (file) {
  return {
    name: file.name,
    length: file.length,
    numPiecesPresent: 0,
    numPieces: null
  }
}

// Every time we resolve a magnet URI, save the torrent file so that we never
// have to download it again. Never ask the DHT the same question twice.
function saveTorrentFile (torrentSummary, torrent) {
  checkIfTorrentFileExists(torrentSummary.infoHash, function (torrentPath, exists) {
    if (exists) {
      // We've already saved the file
      torrentSummary.torrentPath = torrentPath
      saveState()
      return
    }

    // Otherwise, save the .torrent file, under the app config folder
    fs.mkdir(config.CONFIG_TORRENT_PATH, function (_) {
      fs.writeFile(torrentPath, torrent.torrentFile, function (err) {
        if (err) return console.log('error saving torrent file %s: %o', torrentPath, err)
        console.log('saved torrent file %s', torrentPath)
        torrentSummary.torrentPath = torrentPath
        saveState()
      })
    })
  })
}

// Checks whether we've already resolved a given infohash to a torrent file
// Calls back with (torrentPath, exists). Logs, does not call back on error
function checkIfTorrentFileExists (infoHash, cb) {
  var torrentPath = path.join(config.CONFIG_TORRENT_PATH, infoHash + '.torrent')
  fs.exists(torrentPath, function (exists) {
    cb(torrentPath, exists)
  })
}

function startServer (torrentSummary, index, cb) {
  if (state.server) return cb()

  var torrent = getTorrent(torrentSummary.infoHash)
  if (!torrent) torrent = startTorrentingSummary(torrentSummary)
  if (torrent.ready) startServerFromReadyTorrent(torrent, index, cb)
  else torrent.on('ready', () => startServerFromReadyTorrent(torrent, index, cb))
}

function startServerFromReadyTorrent (torrent, index, cb) {
  // automatically choose which file in the torrent to play, if necessary
  if (index === undefined) index = pickFileToPlay(torrent.files)
  if (index === undefined) return cb(new errors.UnplayableError())
  var file = torrent.files[index]

  // update state
  state.playing.infoHash = torrent.infoHash
  state.playing.fileIndex = index
  state.playing.type = TorrentPlayer.isVideo(file) ? 'video'
    : TorrentPlayer.isAudio(file) ? 'audio'
    : 'other'

  // if it's audio, parse out the metadata (artist, title, etc)
  var torrentSummary = getTorrentSummary(torrent.infoHash)
  var fileSummary = torrentSummary.files[index]
  if (state.playing.type === 'audio' && !fileSummary.audioInfo) {
    musicmetadata(file.createReadStream(), function (err, info) {
      if (err) return
      console.log('got audio metadata for %s: %o', file.name, info)
      fileSummary.audioInfo = info
      update()
    })
  }

  // either way, start a streaming torrent-to-http server
  var server = torrent.createServer()
  server.listen(0, function () {
    var port = server.address().port
    var urlSuffix = ':' + port + '/' + index
    state.server = {
      server: server,
      localURL: 'http://localhost' + urlSuffix,
      networkURL: 'http://' + networkAddress() + urlSuffix
    }
    cb()
  })
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
  if (!state.server) return
  state.server.server.destroy()
  state.server = null
  state.playing.infoHash = null
  state.playing.fileIndex = null
}

// Opens the video player
function openPlayer (infoHash, index, cb) {
  var torrentSummary = getTorrentSummary(infoHash)
  var torrent = lazyLoadClient().get(infoHash)
  if (!torrent || !torrent.done) playInterfaceSound('PLAY')
  torrentSummary.playStatus = 'requested'
  update()

  var timeout = setTimeout(function () {
    torrentSummary.playStatus = 'timeout' /* no seeders available? */
    state.navigation.clearPending()
    playInterfaceSound('ERROR')
    update()
  }, 10000) /* give it a few seconds */

  startServer(torrentSummary, index, function (err) {
    clearTimeout(timeout)
    if (err) {
      torrentSummary.playStatus = 'unplayable'
      playInterfaceSound('ERROR')
      update()
      return onError(err)
    }

    // if we timed out (user clicked play a long time ago), don't autoplay
    var timedOut = torrentSummary.playStatus === 'timeout'
    delete torrentSummary.playStatus
    if (timedOut) return update()

    // otherwise, play the video
    state.window.title = torrentSummary.files[state.playing.fileIndex].name
    update()

    ipcRenderer.send('onPlayerOpen')

    cb()
  })
}

function closePlayer (cb) {
  state.window.title = config.APP_WINDOW_TITLE
  update()

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
  var torrent = lazyLoadClient().get(infoHash)
  if (!torrent) return

  var filePath = path.join(torrent.path, torrent.files[index].path)
  ipcRenderer.send('openItem', filePath)
}

function openFolder (infoHash) {
  var torrent = lazyLoadClient().get(infoHash)
  if (!torrent) return

  var folderPath = path.join(torrent.path, torrent.name)
  // Multi-file torrents create their own folder, single file torrents just
  // drop the file directly into the Downloads folder
  fs.stat(folderPath, function (err, stats) {
    if (err || !stats.isDirectory()) {
      folderPath = torrent.path
    }
    ipcRenderer.send('openItem', folderPath)
  })
}

function toggleTorrent (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)
  if (torrentSummary.status === 'paused') {
    torrentSummary.status = 'new'
    startTorrentingSummary(torrentSummary)
    playInterfaceSound('ENABLE')
  } else {
    torrentSummary.status = 'paused'
    stopTorrenting(torrentSummary.infoHash)
    playInterfaceSound('DISABLE')
  }
}

function deleteTorrent (infoHash) {
  var torrent = getTorrent(infoHash)
  if (torrent) torrent.destroy()

  var index = state.saved.torrents.findIndex((x) => x.infoHash === infoHash)
  if (index > -1) state.saved.torrents.splice(index, 1)
  saveState()
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
  var width = Math.floor(dimensions.width * scaleFactor)
  var height = Math.floor(dimensions.height * scaleFactor)

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
  console.log('warning: %s', err.message)
}

function showDoneNotification (torrent) {
  if (state.window.isFocused) return

  var notif = new window.Notification('Download Complete', {
    body: torrent.name,
    silent: true
  })

  notif.onclick = function () {
    window.focus()
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
