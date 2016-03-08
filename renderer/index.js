console.time('init')

var airplay = require('airplay-js')
var cfg = require('application-config')('WebTorrent')
var cfgDirectory = require('application-config-path')('WebTorrent')
var chromecasts = require('chromecasts')()
var config = require('../config')
var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var electron = require('electron')
var EventEmitter = require('events')
var fs = require('fs')
var ipcRenderer = electron.ipcRenderer
var mainLoop = require('main-loop')
var networkAddress = require('network-address')
var path = require('path')
var torrentPoster = require('./lib/torrent-poster')
var WebTorrent = require('webtorrent')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')

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
  state.client.on('error', onError)
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

  // All state lives in state.js. `state.saved` is read from and written to a
  // file. All other state is ephemeral. Here we'll load state.saved:
  window.addEventListener('beforeunload', saveState)

  // listen for messages from the main process
  setupIpc()

  // OS integrations:
  // ...Chromecast and Airplay
  detectDevices()

  // ...drag and drop a torrent or video file to play or seed
  dragDrop('body', onFiles)

  // ...same thing if you paste a torrent
  document.addEventListener('paste', function () {
    ipcRenderer.send('addTorrentFromPaste')
  })

  // ...keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.which === 27) { /* ESC means either exit fullscreen or go back */
      if (state.isFullScreen) {
        dispatch('toggleFullScreen')
      } else {
        dispatch('back')
      }
    } else if (e.which === 32) {
      dispatch('playPause')
    }
  })

  // ...focus and blur. Needed to show correct dock icon text ("badge") in OSX
  window.addEventListener('focus', function () {
    state.isFocused = true
    state.dock.badge = 0
  })

  window.addEventListener('blur', function () {
    state.isFocused = false
  })

  // Done! Ideally we want to get here <100ms after the user clicks the app
  document.querySelector('.loading').remove() /* TODO: no spinner once fast enough */
  console.timeEnd('init')
}

// This is the (mostly) pure funtion from state -> UI. Returns a virtual DOM
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
  if (state.title !== state.prev.title) {
    state.prev.title = state.title
    ipcRenderer.send('setTitle', state.title)
  }
  if (state.dock.progress !== state.prev.progress) {
    state.prev.progress = state.dock.progress
    ipcRenderer.send('setProgress', state.dock.progress)
  }
  if (state.dock.badge !== state.prev.badge) {
    ipcRenderer.send('setBadge', state.dock.badge || '')
  }
}

// Events from the UI never modify state directly. Instead they call dispatch()
function dispatch (action, ...args) {
  if (['videoMouseMoved', 'playbackJump'].indexOf(action) < 0) {
    console.log('dispatch: %s %o', action, args) /* log user interactions, but don't spam */
  }
  if (action === 'addTorrent') {
    addTorrent(args[0] /* torrent */)
  }
  if (action === 'seed') {
    seed(args[0] /* files */)
  }
  if (action === 'openPlayer') {
    openPlayer(args[0] /* infoHash */)
  }
  if (action === 'toggleTorrent') {
    toggleTorrent(args[0] /* infoHash */)
  }
  if (action === 'deleteTorrent') {
    deleteTorrent(args[0] /* infoHash */)
  }
  if (action === 'openChromecast') {
    openChromecast(args[0] /* infoHash */)
  }
  if (action === 'openAirplay') {
    openAirplay(args[0] /* infoHash */)
  }
  if (action === 'setDimensions') {
    setDimensions(args[0] /* dimensions */)
  }
  if (action === 'back') {
    // TODO
    // window.history.back()
    closePlayer()
  }
  if (action === 'forward') {
    // TODO
    // window.history.forward()
  }
  if (action === 'playPause') {
    state.video.isPaused = !state.video.isPaused
    update()
  }
  if (action === 'playbackJump') {
    state.video.jumpToTime = args[0] /* seconds */
    update()
  }
  if (action === 'toggleFullScreen') {
    ipcRenderer.send('toggleFullScreen')
    update()
  }
  if (action === 'videoMouseMoved') {
    state.video.mouseStationarySince = new Date().getTime()
    update()
  }
}

function setupIpc () {
  ipcRenderer.on('addTorrent', function (e, torrentId) {
    dispatch('addTorrent', torrentId)
  })

  ipcRenderer.on('seed', function (e, files) {
    dispatch('seed', files)
  })

  ipcRenderer.on('fullscreenChanged', function (e, isFullScreen) {
    state.isFullScreen = isFullScreen
    update()
  })

  ipcRenderer.on('addFakeDevice', function (e, device) {
    var player = new EventEmitter()
    player.play = (networkURL) => console.log(networkURL)
    state.devices[device] = player
    update()
  })
}

function detectDevices () {
  chromecasts.on('update', function (player) {
    state.devices.chromecast = player
  })

  airplay.createBrowser().on('deviceOn', function (player) {
    state.devices.airplay = player
  }).start()
}

// Load state.saved from the JSON state file
function loadState (callback) {
  cfg.read(function (err, data) {
    if (err) console.error(err)
    ipcRenderer.send('log', 'loaded state from ' + cfg.filePath)

    // populate defaults if they're not there
    state.saved = Object.assign({}, state.defaultSavedState, data)

    if (callback) callback()
  })
}

// Starts all torrents that aren't paused on program startup
function resumeTorrents () {
  state.saved.torrents
    .filter((x) => x.status !== 'paused')
    .forEach((x) => startTorrenting(x.infoHash))
}

// Write state.saved to the JSON state file
function saveState () {
  ipcRenderer.send('log', 'saving state to ' + cfg.filePath)
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

function onFiles (files) {
  // .torrent file = start downloading the torrent
  files.filter(isTorrentFile).forEach(function (torrentFile) {
    dispatch('addTorrent', torrentFile)
  })

  // everything else = seed these files
  dispatch('seed', files.filter(isNotTorrentFile))
}

function isTorrentFile (file) {
  var extname = path.extname(file.name).toLowerCase()
  return extname === '.torrent'
}

function isNotTorrentFile (file) {
  return !isTorrentFile(file)
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
  // Charlie Chaplin: 'magnet:?xt=urn:btih:cddf0459a718523480f7499da5ed1a504cffecb8&dn=charlie%5Fchaplin%5Ffilm%5Ffestival'
  if (!torrentId) torrentId = 'magnet:?xt=urn:btih:6a02592d2bbc069628cd5ed8a54f88ee06ac0ba5&dn=CosmosLaundromatFirstCycle'

  var torrent = startTorrenting(torrentId)

  // If torrentId is a torrent file, wait for WebTorrent to finish reading it
  if (!torrent.infoHash) torrent.on('infoHash', addTorrentToList)
  else addTorrentToList()

  function addTorrentToList () {
    if (getTorrentSummary(torrent.infoHash)) {
      return // Skip, torrent is already in state.saved
    }
    state.saved.torrents.push({
      status: 'new',
      name: torrent.name,
      magnetURI: torrent.magnetURI,
      infoHash: torrent.infoHash
    })
    saveState()
  }
}

// Starts downloading and/or seeding a given torrent, torrentSummary or magnet URI
function startTorrenting (infoHash) {
  var torrent = state.client.add(infoHash, {
    // Use downloads folder
    path: state.saved.downloadPath
  })
  addTorrentEvents(torrent)
  return torrent
}

// Stops downloading and/or seeding. See startTorrenting
function stopTorrenting (infoHash) {
  var torrent = getTorrent(infoHash)
  if (torrent) torrent.destroy()
}

// Creates a torrent for a local file and starts seeding it
function seed (files) {
  if (files.length === 0) return
  var torrent = state.client.seed(files)
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
    torrentSummary.name = torrent.name
    torrentSummary.infoHash = torrent.infoHash

    if (!torrentSummary.posterURL) {
      generateTorrentPoster(torrent, torrentSummary)
    }

    update()
  }

  function torrentDone () {
    var torrentSummary = getTorrentSummary(torrent.infoHash)
    torrentSummary.status = 'seeding'

    if (!state.isFocused) {
      state.dock.badge += 1
    }

    update()
  }
}

function generateTorrentPoster (torrent, torrentSummary) {
  torrentPoster(torrent, function (err, buf) {
    if (err) return onWarning(err)
    // save it for next time
    var posterFilePath = path.join(cfgDirectory, torrent.infoHash + '.jpg')
    fs.writeFile(posterFilePath, buf, function (err) {
      if (err) return onWarning(err)
      // show the poster
      torrentSummary.posterURL = 'file:///' + posterFilePath
      update()
    })
  })
}

function startServer (infoHash, cb) {
  if (state.server) return cb()

  var torrent = getTorrent(infoHash)
  if (!torrent) torrent = startTorrenting(infoHash)
  if (torrent.ready) startServerFromReadyTorrent(torrent, cb)
  else torrent.on('ready', () => startServerFromReadyTorrent(torrent, cb))
}

function startServerFromReadyTorrent (torrent, cb) {
  // use largest file
  state.torrentPlaying = torrent.files.reduce(function (a, b) {
    return a.length > b.length ? a : b
  })
  var index = torrent.files.indexOf(state.torrentPlaying)

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
  state.server.server.destroy()
  state.server = null
}

function openPlayer (infoHash) {
  startServer(infoHash, function () {
    state.url = '/player'
    /* TODO: set state.title to the clean name of the torrent */
    update()
  })
}

function closePlayer () {
  state.url = '/'
  state.title = config.APP_NAME
  update()

  if (state.isFullScreen) {
    ipcRenderer.send('toggleFullScreen')
  }
  restoreBounds()
  stopServer()
  update()
}

function toggleTorrent (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)
  if (!torrentSummary) return
  if (torrentSummary.status === 'paused') {
    torrentSummary.status = 'new'
    startTorrenting(torrentSummary.infoHash)
  } else {
    torrentSummary.status = 'paused'
    stopTorrenting(torrentSummary.infoHash)
  }
}

function deleteTorrent (infoHash) {
  var torrent = getTorrent(infoHash)
  torrent.destroy()

  var index = state.saved.torrents.findIndex((x) => x.infoHash === infoHash)
  if (index > -1) state.saved.torrents.splice(index, 1)
  saveState()
}

function openChromecast (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)
  startServer(infoHash, function () {
    state.devices.chromecast.play(state.server.networkURL, {
      title: config.APP_NAME + ' — ' + torrentSummary.name
    })
    state.devices.chromecast.on('error', function (err) {
      err.message = 'Chromecast: ' + err.message
      onError(err)
    })
    update()
  })
}

function openAirplay (infoHash) {
  startServer(infoHash, function () {
    state.devices.airplay.play(state.server.networkURL, 0, function () {
      // TODO: handle airplay errors
    })
    update()
  })
}

// Set window dimensions to match video dimensions or fill the screen
function setDimensions (dimensions) {
  state.mainWindowBounds = {
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
  if (state.mainWindowBounds) {
    ipcRenderer.send('setBounds', state.mainWindowBounds, true)
  }
}

function onError (err) {
  console.error(err.stack)
  window.alert(err.message || err)
  update()
}

function onWarning (err) {
  console.log('warning: %s', err.message)
}
