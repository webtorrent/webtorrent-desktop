console.time('init')

var cfg = require('application-config')('WebTorrent')
var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var electron = require('electron')
var EventEmitter = require('events')
var fs = require('fs')
var mainLoop = require('main-loop')
var mkdirp = require('mkdirp')
var networkAddress = require('network-address')
var path = require('path')
var remote = require('remote')
var WebTorrent = require('webtorrent')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')
var Cast = require('./lib/cast')
var errors = require('./lib/errors')
var config = require('../config')
var TorrentPlayer = require('./lib/torrent-player')
var torrentPoster = require('./lib/torrent-poster')

// Electron apps have two processes: a main process (node) runs first and starts
// a renderer process (essentially a Chrome window). We're in the renderer process,
// and this IPC channel receives from and sends messages to the main process
var ipcRenderer = electron.ipcRenderer
var clipboard = electron.clipboard

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

  // Connect to the WebTorrent and BitTorrent networks
  // WebTorrent.app is a hybrid client, as explained here: https://webtorrent.io/faq
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
  resumeTorrents() /* restart everything we were torrenting last time the app ran */
  setInterval(updateTorrentProgress, 1000)

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

  // Calling update() updates the UI given the current state
  // Do this at least once a second to show latest state for each torrent
  // (eg % downloaded) and to keep the cursor in sync when playing a video
  setInterval(function () {
    update()
    updateClientProgress()
  }, 1000)

  window.addEventListener('beforeunload', saveState)

  // listen for messages from the main process
  setupIpc()

  // OS integrations:
  // ...Chromecast and Airplay
  Cast.init(update)

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

  // Done! Ideally we want to get here <100ms after the user clicks the app
  document.querySelector('.loading').remove() /* TODO: no spinner once fast enough */
  playInterfaceSound(config.SOUND_STARTUP)
  console.timeEnd('init')
}

// This is the (mostly) pure function from state -> UI. Returns a virtual DOM
// tree. Any events, such as button clicks, will turn into calls to dispatch()
function render (state) {
  return App(state, dispatch)
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
  if (['mediaMouseMoved', 'playbackJump'].indexOf(action) === -1) {
    console.log('dispatch: %s %o', action, args) /* log user interactions, but don't spam */
  }
  if (action === 'onOpen') {
    onOpen(args[0] /* files */)
  }
  if (action === 'addTorrent') {
    addTorrent(args[0] /* torrent */)
  }
  if (action === 'showOpenTorrentFile') {
    ipcRenderer.send('showOpenTorrentFile')
  }
  if (action === 'seed') {
    seed(args[0] /* files */)
  }
  if (action === 'play') {
    state.location.go({
      url: 'player',
      onbeforeload: function (cb) {
        // TODO: handle audio. video only for now.
        openPlayer(args[0] /* torrentSummary */, args[1] /* index */, cb)
      },
      onbeforeunload: closePlayer
    })
  }
  if (action === 'openFile') {
    openFile(args[0] /* torrentSummary */, args[1] /* index */)
  }
  if (action === 'openFolder') {
    openFolder(args[0] /* torrentSummary */)
  }
  if (action === 'toggleTorrent') {
    toggleTorrent(args[0] /* torrentSummary */)
  }
  if (action === 'deleteTorrent') {
    deleteTorrent(args[0] /* torrentSummary */)
  }
  if (action === 'toggleSelectTorrent') {
    toggleSelectTorrent(args[0] /* infoHash */)
  }
  if (action === 'openChromecast') {
    Cast.openChromecast()
  }
  if (action === 'openAirplay') {
    Cast.openAirplay()
  }
  if (action === 'stopCasting') {
    Cast.stopCasting()
  }
  if (action === 'setDimensions') {
    setDimensions(args[0] /* dimensions */)
  }
  if (action === 'back') {
    state.location.back()
    update()
  }
  if (action === 'forward') {
    state.location.forward()
    update()
  }
  if (action === 'playPause') {
    playPause()
  }
  if (action === 'play') {
    playPause(false)
  }
  if (action === 'pause') {
    playPause(true)
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
  if (action === 'toggleFullScreen') {
    ipcRenderer.send('toggleFullScreen', args[0])
    update()
  }
  if (action === 'mediaMouseMoved') {
    state.playing.mouseStationarySince = new Date().getTime()
    update()
  }
  if (action === 'exitModal') {
    state.modal = null
    update()
  }
}

// Plays or pauses the video. If isPaused is undefined, acts as a toggle
function playPause (isPaused) {
  if (isPaused === state.playing.isPaused) {
    return // Nothing to do
  }
  // Either isPaused is undefined, or it's the opposite of the current state. Toggle.
  if (Cast.isCasting()) {
    Cast.playPause()
  }
  state.playing.isPaused = !state.playing.isPaused
  update()
}

function jumpToTime (time) {
  if (Cast.isCasting()) {
    Cast.seek(time)
  } else {
    state.playing.jumpToTime = time
    update()
  }
}

function changeVolume (delta) {
  // change volume with delta value
  setVolume(state.playing.volume + delta)
}

function setVolume (volume) {
  // check if its in [0.0 - 1.0] range
  volume = Math.max(0, Math.min(1, volume))
  if (Cast.isCasting()) {
    Cast.setVolume(volume)
  } else {
    state.playing.setVolume = volume
    update()
  }
}

function setupIpc () {
  ipcRenderer.send('ipcReady')

  ipcRenderer.on('log', (e, ...args) => console.log(...args))
  ipcRenderer.on('error', (e, ...args) => console.error(...args))

  ipcRenderer.on('dispatch', (e, ...args) => dispatch(...args))

  ipcRenderer.on('showOpenTorrentAddress', function (e) {
    state.modal = 'open-torrent-address-modal'
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

function updateClientProgress () {
  var progress = state.client.progress
  var activeTorrentsExist = state.client.torrents.some(function (torrent) {
    return torrent.progress !== 1
  })
  // Hide progress bar when client has no torrents, or progress is 100%
  if (!activeTorrentsExist || progress === 1) {
    progress = -1
  }
  state.dock.progress = progress
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
  return state.client.torrents.find((x) => x.infoHash === infoHash)
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
      magnetURI: torrent.magnetURI,
      infoHash: torrent.infoHash
    })
    saveState()
    playInterfaceSound(config.SOUND_ADD)
  }
}

// Starts downloading and/or seeding a given torrentSummary. Returns WebTorrent object
function startTorrentingSummary (torrentSummary) {
  var s = torrentSummary
  if (s.torrentPath) return startTorrentingID(s.torrentPath, s.path)
  else if (s.magnetURI) return startTorrentingID(s.magnetURI, s.path)
  else return startTorrentingID(s.infoHash, s.path)
}

// Starts a given TorrentID, which can be an infohash, magnet URI, etc. Returns WebTorrent object
// See https://github.com/feross/webtorrent/blob/master/docs/api.md#clientaddtorrentid-opts-function-ontorrent-torrent-
function startTorrentingID (torrentID, path) {
  console.log('Starting torrent ' + torrentID)
  var torrent = state.client.add(torrentID, {
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
  var torrent = state.client.seed(files)
  addTorrentToList(torrent)
  addTorrentEvents(torrent)
}

function addTorrentEvents (torrent) {
  torrent.on('infoHash', update)
  torrent.on('ready', torrentReady)
  torrent.on('done', torrentDone)

  function torrentReady () {
    // Summarize torrent
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    torrentSummary.status = 'downloading'
    torrentSummary.ready = true
    torrentSummary.name = torrentSummary.displayName || torrent.name
    torrentSummary.infoHash = torrent.infoHash
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
  // TODO: ideally this would be tracked by WebTorrent, which could do it
  // more efficiently than looping over torrent.bitfield
  var changed = false
  state.client.torrents.forEach(function (torrent) {
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    if (!torrentSummary) return
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
        torrentSummary.posterURL = 'file:///' + posterFilePath
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
        if (err) return console.log('Error saving torrent file %s: %o', torrentPath, err)
        console.log('Saved torrent file %s', torrentPath)
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
  state.playing.type = TorrentPlayer.isVideo(file) ? 'video' : 'audio'

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
function openPlayer (torrentSummary, index, cb) {
  var torrent = state.client.get(torrentSummary.infoHash)
  if (!torrent || !torrent.done) playInterfaceSound(config.SOUND_PLAY)
  torrentSummary.playStatus = 'requested'
  update()

  var timeout = setTimeout(function () {
    torrentSummary.playStatus = 'timeout' /* no seeders available? */
    playInterfaceSound(config.SOUND_ERROR)
    update()
  }, 10000) /* give it a few seconds */

  startServer(torrentSummary, index, function (err) {
    clearTimeout(timeout)
    if (err) {
      torrentSummary.playStatus = 'unplayable'
      playInterfaceSound(config.SOUND_ERROR)
      update()
      return onError(err)
    }

    // if we timed out (user clicked play a long time ago), don't autoplay
    var timedOut = torrentSummary.playStatus === 'timeout'
    delete torrentSummary.playStatus
    if (timedOut) return update()

    // otherwise, play the video
    state.window.title = torrentSummary.name
    update()
    cb()
  })
}

function openFile (torrentSummary, index) {
  var torrent = state.client.get(torrentSummary.infoHash)
  if (!torrent) return

  var filePath = path.join(torrent.path, torrent.files[index].path)
  ipcRenderer.send('openItem', filePath)
}

function openFolder (torrentSummary) {
  var torrent = state.client.get(torrentSummary.infoHash)
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

function closePlayer (cb) {
  state.window.title = config.APP_NAME
  update()

  if (state.window.isFullScreen) {
    dispatch('toggleFullScreen', false)
  }
  restoreBounds()
  stopServer()
  update()

  ipcRenderer.send('unblockPowerSave')

  cb()
}

function toggleTorrent (torrentSummary) {
  if (torrentSummary.status === 'paused') {
    torrentSummary.status = 'new'
    startTorrentingSummary(torrentSummary)
    playInterfaceSound(config.SOUND_ENABLE)
  } else {
    torrentSummary.status = 'paused'
    stopTorrenting(torrentSummary.infoHash)
    playInterfaceSound(config.SOUND_DISABLE)
  }
}

function deleteTorrent (torrentSummary) {
  var infoHash = torrentSummary.infoHash
  var torrent = getTorrent(infoHash)
  if (torrent) torrent.destroy()

  var index = state.saved.torrents.findIndex((x) => x.infoHash === infoHash)
  if (index > -1) state.saved.torrents.splice(index, 1)
  saveState()
  state.location.clearForward() // prevent user from going forward to a deleted torrent
  playInterfaceSound(config.SOUND_DELETE)
}

function toggleSelectTorrent (infoHash) {
  // toggle selection
  state.selectedInfoHash = state.selectedInfoHash === infoHash ? null : infoHash
  update()
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
  playInterfaceSound(config.SOUND_ERROR)
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

  playInterfaceSound(config.SOUND_DONE)
}

function playInterfaceSound (url) {
  var audio = new window.Audio()
  audio.volume = 0.3
  audio.src = url
  audio.play()
}
