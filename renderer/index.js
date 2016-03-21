console.time('init')

var cfg = require('application-config')('WebTorrent')
var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var electron = require('electron')
var EventEmitter = require('events')
var fs = require('fs')
var mainLoop = require('main-loop')
var networkAddress = require('network-address')
var path = require('path')
var WebTorrent = require('webtorrent')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')
var config = require('../config')
var torrentPoster = require('./lib/torrent-poster')
var TorrentPlayer = require('./lib/torrent-player')
var Cast = require('./lib/cast')

// Electron apps have two processes: a main process (node) runs first and starts
// a renderer process (essentially a Chrome window). We're in the renderer process,
// and this IPC channel receives from and sends messages to the main process
var ipcRenderer = electron.ipcRenderer
var clipboard = electron.clipboard

// For easy debugging in Developer Tools
var state = global.state = require('./state')

// Force use of webtorrent trackers on all torrents
global.WEBTORRENT_ANNOUNCE = createTorrent.announceList
  .map(function (arr) {
    return arr[0]
  })
  .filter(function (url) {
    return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
  })

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
  // Connect to the WebTorrent and BitTorrent networks
  // WebTorrent.app is a hybrid client, as explained here: https://webtorrent.io/faq
  state.client = new WebTorrent()
  state.client.on('warning', onWarning)
  state.client.on('error', function (err) {
    // TODO: WebTorrent should have semantic errors
    if (err.message.startsWith('There is already a swarm')) onError('Couldn\'t add duplicate torrent')
    else onError(err)
  })
  resumeTorrents() /* restart everything we were torrenting last time the app ran */

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
  if (['videoMouseMoved', 'playbackJump'].indexOf(action) < 0) {
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
    // TODO: handle audio. video only for now.
    openPlayer(args[0] /* torrentSummary */, args[1] /* index */)
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
    // TODO
    // window.history.back()
    ipcRenderer.send('unblockPowerSave')
    closePlayer()
  }
  if (action === 'forward') {
    // TODO
    // window.history.forward()
  }
  if (action === 'playPause') {
    playPause()
  }
  if (action === 'playbackJump') {
    jumpToTime(args[0] /* seconds */)
  }
  if (action === 'changeVolume') {
    changeVolume(args[0] /* increase */)
  }
  if (action === 'videoPlaying') {
    ipcRenderer.send('blockPowerSave')
  }
  if (action === 'videoPaused') {
    ipcRenderer.send('paused-video')
    ipcRenderer.send('unblockPowerSave')
  }
  if (action === 'toggleFullScreen') {
    ipcRenderer.send('toggleFullScreen', args[0])
    update()
  }
  if (action === 'videoMouseMoved') {
    state.video.mouseStationarySince = new Date().getTime()
    update()
  }
  if (action === 'exitModal') {
    state.modal = null
    update()
  }
}

function playPause () {
  if (Cast.isCasting()) {
    Cast.playPause()
  }
  state.video.isPaused = !state.video.isPaused
  update()
}

function jumpToTime (time) {
  if (Cast.isCasting()) {
    Cast.seek(time)
  } else {
    state.video.jumpToTime = time
    update()
  }
}

function changeVolume (delta) {
  // change volume with delta value
  setVolume(state.video.volume + delta)
}

function setVolume (volume) {
  // check if its in [0.0 - 1.0] range
  volume = Math.max(0, Math.min(1, volume))
  if (Cast.isCasting()) {
    Cast.setVolume(volume)
  } else {
    state.video.setVolume = volume
    update()
  }
}

function setupIpc () {
  ipcRenderer.send('ipcReady')

  ipcRenderer.on('log', (e, ...args) => console.log(...args))

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
function loadState (callback) {
  cfg.read(function (err, data) {
    if (err) console.error(err)
    console.log('loaded state from ' + cfg.filePath)

    // populate defaults if they're not there
    state.saved = Object.assign({}, state.defaultSavedState, data)
    state.saved.torrents.forEach(function (torrentSummary) {
      if (torrentSummary.displayName) torrentSummary.name = torrentSummary.displayName
    })
    saveState()

    if (callback) callback()
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
  if (s.torrentPath) return startTorrentingID(s.torrentPath)
  else if (s.magnetURI) return startTorrentingID(s.magnetURI)
  else return startTorrentingID(s.infoHash)
}

// Starts a given TorrentID, which can be an infohash, magnet URI, etc. Returns WebTorrent object
// See https://github.com/feross/webtorrent/blob/master/docs/api.md#clientaddtorrentid-opts-function-ontorrent-torrent-
function startTorrentingID (torrentID) {
  var torrent = state.client.add(torrentID, {
    path: state.saved.downloadPath // Use downloads folder
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
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    torrentSummary.status = 'downloading'
    torrentSummary.ready = true
    torrentSummary.name = torrentSummary.displayName || torrent.name
    torrentSummary.infoHash = torrent.infoHash

    saveTorrentFile(torrentSummary, torrent)

    if (!torrentSummary.posterURL) {
      generateTorrentPoster(torrent, torrentSummary)
    }

    update()
  }

  function torrentDone () {
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    torrentSummary.status = 'seeding'

    if (!state.window.isFocused) {
      state.dock.badge += 1
    }

    showDoneNotification(torrent)
    update()
  }
}

function generateTorrentPoster (torrent, torrentSummary) {
  torrentPoster(torrent, function (err, buf) {
    if (err) return onWarning(err)
    // save it for next time
    fs.mkdir(config.CONFIG_POSTER_PATH, function (_) {
      var posterFilePath = path.join(config.CONFIG_POSTER_PATH, torrent.infoHash + '.jpg')
      fs.writeFile(posterFilePath, buf, function (err) {
        if (err) return onWarning(err)
        // show the poster
        torrentSummary.posterURL = 'file:///' + posterFilePath
        update()
      })
    })
  })
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
  if (!index) {
    // filter out file formats that the <video> tag definitely can't play
    var files = torrent.files.filter(TorrentPlayer.isPlayable)
    if (files.length === 0) return cb(new Error('Can\'t play any files in torrent'))
    // use largest file
    var largestFile = files.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    index = torrent.files.indexOf(largestFile)
  }

  // update state
  state.playing.infoHash = torrent.infoHash
  state.playing.fileIndex = index

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

function stopServer () {
  if (!state.server) return
  state.server.server.destroy()
  state.server = null
  state.playing.infoHash = null
  state.playing.fileIndex = null
}

// Opens the video player
function openPlayer (torrentSummary, index) {
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
    if (err) return onError(err)

    // if we timed out (user clicked play a long time ago), don't autoplay
    clearTimeout(timeout)
    var timedOut = torrentSummary.playStatus === 'timeout'
    delete torrentSummary.playStatus
    if (timedOut) return

    // otherwise, play the video
    state.url = 'player'
    state.window.title = torrentSummary.name
    update()
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

function closePlayer () {
  state.url = 'home'
  state.window.title = config.APP_NAME
  update()

  if (state.window.isFullScreen) {
    dispatch('toggleFullScreen', false)
  }

  restoreBounds()
  stopServer()
  update()
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
  playInterfaceSound(config.SOUND_DELETE)
}

function toggleSelectTorrent (infoHash) {
  // toggle selection
  state.selectedInfoHash = state.selectedInfoHash === infoHash ? null : infoHash
  update()
}

// Set window dimensions to match video dimensions or fill the screen
function setDimensions (dimensions) {
  state.window.bounds = {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight
  }

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
    ipcRenderer.send('setBounds', state.window.bounds, true)
  }
}

function onError (err) {
  if (err.stack) console.error(err.stack)
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
