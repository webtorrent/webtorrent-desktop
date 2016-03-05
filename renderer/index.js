/* global URL, Blob */

var airplay = require('airplay-js')
var chromecasts = require('chromecasts')()
var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var electron = require('electron')
var EventEmitter = require('events')
var mainLoop = require('main-loop')
var networkAddress = require('network-address')
var path = require('path')
var throttle = require('throttleit')
var torrentPoster = require('./lib/torrent-poster')
var WebTorrent = require('webtorrent')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')

var HEADER_HEIGHT = 38

// Force use of webtorrent trackers on all torrents
global.WEBTORRENT_ANNOUNCE = createTorrent.announceList
  .map(function (arr) {
    return arr[0]
  })
  .filter(function (url) {
    return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
  })

var state = global.state = {
  /* Temporary state disappears once the program exits.
   * It can contain complex objects like open connections, etc.
   */
  temp: {
    url: '/',
    client: null, /* the WebTorrent client */
    server: null, /* local WebTorrent-to-HTTP server */
    dock: {
      badge: 0,
      progress: 0
    },
    devices: {
      airplay: null, /* airplay client. finds and manages AppleTVs */
      chromecast: null /* chromecast client. finds and manages Chromecasts */
    },
    torrentPlaying: null, /* the torrent we're streaming. see client.torrents */
    // history: [], /* track how we got to the current view. enables Back button */
    // historyIndex: 0,
    isFocused: true,
    isFullScreen: false,
    mainWindowBounds: null, /* x y width height */
    title: 'WebTorrent', /* current window title */
    video: {
      isPaused: false,
      currentTime: 0, /* seconds */
      duration: 1 /* seconds */
    }
  },
  /* Saved state is read from and written to ~/.webtorrent/state.json
   * It should be simple and minimal and must be JSONifiable
   */
  saved: {
    torrents: [
      {
        name: 'Elephants Dream',
        torrentFile: 'resources/ElephantsDream_archive.torrent'
      },
      {
        name: 'Big Buck Bunny',
        torrentFile: 'resources/BigBuckBunny_archive.torrent'
      },
      {
        name: 'Sintel',
        torrentFile: 'resources/Sintel_archive.torrent'
      },
      {
        name: 'Tears of Steel',
        torrentFile: 'resources/TearsOfSteel_archive.torrent'
      }
    ]
  }
}

var client, vdomLoop, updateThrottled

function init () {
  client = global.client = new WebTorrent()
  client.on('warning', onWarning)
  client.on('error', onError)
  state.temp.client = client

  vdomLoop = mainLoop(state, render, {
    create: createElement,
    diff: diff,
    patch: patch
  })
  document.body.appendChild(vdomLoop.target)

  updateThrottled = throttle(update, 1000)

  dragDrop('body', onFiles)

  chromecasts.on('update', function (player) {
    state.temp.devices.chromecast = player
    update()
  })

  airplay.createBrowser().on('deviceOn', function (player) {
    state.temp.devices.airplay = player
  }).start()

  document.addEventListener('paste', function () {
    electron.ipcRenderer.send('addTorrentFromPaste')
  })

  document.addEventListener('keydown', function (e) {
    if (e.which === 27) { /* ESC means either exit fullscreen or go back */
      if (state.temp.isFullScreen) {
        dispatch('toggleFullScreen')
      } else {
        dispatch('back')
      }
    }
  })

  window.addEventListener('focus', function () {
    state.temp.isFocused = true
    if (state.temp.dock.badge > 0) electron.ipcRenderer.send('setBadge', '')
    state.temp.dock.badge = 0
  })

  window.addEventListener('blur', function () {
    state.temp.isFocused = false
  })
}
init()

function render (state) {
  return App(state, dispatch)
}

function update () {
  vdomLoop.update(state)
  updateDockIcon()
}

setInterval(function () {
  updateThrottled()
}, 1000)

function updateDockIcon () {
  var progress = state.temp.client.progress
  var activeTorrentsExist = state.temp.client.torrents.some(function (torrent) {
    return torrent.progress !== 1
  })
  // Hide progress bar when client has no torrents, or progress is 100%
  if (!activeTorrentsExist || progress === 1) {
    progress = -1
  }
  if (progress !== state.temp.dock.progress) {
    state.temp.dock.progress = progress
    electron.ipcRenderer.send('setProgress', progress)
  }
}

function dispatch (action, ...args) {
  console.log('dispatch: %s %o', action, args)
  if (action === 'addTorrent') {
    addTorrent(args[0] /* torrentId */)
  }
  if (action === 'seed') {
    seed(args[0] /* files */)
  }
  if (action === 'openPlayer') {
    openPlayer(args[0] /* torrent */)
  }
  if (action === 'deleteTorrent') {
    deleteTorrent(args[0] /* torrent */)
  }
  if (action === 'openChromecast') {
    openChromecast(args[0] /* torrent */)
  }
  if (action === 'openAirplay') {
    openAirplay(args[0] /* torrent */)
  }
  if (action === 'setDimensions') {
    setDimensions(args[0] /* dimensions */)
  }
  if (action === 'back') {
    if (state.temp.url === '/player') {
      restoreBounds()
      closeServer()
    }
    state.temp.url = '/'
    update()
  }
  if (action === 'playPause') {
    state.temp.video.isPaused = !state.temp.video.isPaused
    update()
  }
  if (action === 'playbackJump') {
    state.temp.video.jumpToTime = args[0] /* seconds */
    update()
  }
  if (action === 'toggleFullScreen') {
    electron.ipcRenderer.send('toggleFullScreen')
  }
}

electron.ipcRenderer.on('addTorrent', function (e, torrentId) {
  addTorrent(torrentId)
})

electron.ipcRenderer.on('seed', function (e, files) {
  seed(files)
})

electron.ipcRenderer.on('fullscreenChanged', function (e, isFullScreen) {
  state.temp.isFullScreen = isFullScreen
  update()
})

electron.ipcRenderer.on('addFakeDevice', function (e, device) {
  var player = new EventEmitter()
  player.play = (networkURL) => console.log(networkURL)
  state.temp.devices[device] = player
  update()
})

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

function addTorrent (torrentId) {
  var torrent = client.add(torrentId)
  addTorrentEvents(torrent)
}

function seed (files) {
  if (files.length === 0) return
  var torrent = client.seed(files)
  addTorrentEvents(torrent)
}

function addTorrentEvents (torrent) {
  torrent.on('infoHash', update)
  torrent.on('done', function () {
    if (!state.temp.isFocused) {
      state.temp.dock.badge += 1
      electron.ipcRenderer.send('setBadge', state.temp.dock.badge)
    }
    update()
  })
  torrent.on('download', updateThrottled)
  torrent.on('upload', updateThrottled)
  torrent.on('ready', function () {
    torrentReady(torrent)
  })
  update()
}

function torrentReady (torrent) {
  torrentPoster(torrent, function (err, buf) {
    if (err) return onWarning(err)
    torrent.posterURL = URL.createObjectURL(new Blob([ buf ], { type: 'image/png' }))
    update()
  })
  update()
}

function startServer (torrent, cb) {
  if (state.temp.server) return cb()

  // use largest file
  state.temp.torrentPlaying = torrent.files.reduce(function (a, b) {
    return a.length > b.length ? a : b
  })
  var index = torrent.files.indexOf(state.temp.torrentPlaying)

  var server = torrent.createServer()
  server.listen(0, function () {
    var port = server.address().port
    var urlSuffix = ':' + port + '/' + index
    state.temp.server = {
      server: server,
      localURL: 'http://localhost' + urlSuffix,
      networkURL: 'http://' + networkAddress() + urlSuffix
    }
    cb()
  })
}

function closeServer () {
  state.temp.server.server.destroy()
  state.temp.server = null
}

function openPlayer (torrent) {
  startServer(torrent, function () {
    state.temp.url = '/player'
    update()
  })
}

function deleteTorrent (torrent) {
  torrent.destroy(update)
}

function openChromecast (torrent) {
  startServer(torrent, function () {
    state.temp.devices.chromecast.play(state.temp.server.networkURL, {
      title: 'WebTorrent — ' + torrent.name
    })
    state.temp.devices.chromecast.on('error', function (err) {
      err.message = 'Chromecast: ' + err.message
      onError(err)
    })
    update()
  })
}

function openAirplay (torrent) {
  startServer(torrent, function () {
    state.temp.devices.airplay.play(state.temp.server.networkURL, 0, function () {
      // TODO: handle airplay errors
    })
    update()
  })
}

function setDimensions (dimensions) {
  state.temp.mainWindowBounds = electron.remote.getCurrentWindow().getBounds()

  // Limit window size to screen size
  var workAreaSize = electron.remote.screen.getPrimaryDisplay().workAreaSize
  var aspectRatio = dimensions.width / dimensions.height

  var scaleFactor = Math.min(
    Math.min(workAreaSize.width / dimensions.width, 1),
    Math.min(workAreaSize.height / dimensions.height, 1)
  )

  var width = Math.floor(dimensions.width * scaleFactor)
  var height = Math.floor(dimensions.height * scaleFactor)

  height += HEADER_HEIGHT

  // Center window on screen
  var x = Math.floor((workAreaSize.width - width) / 2)
  var y = Math.floor((workAreaSize.height - height) / 2)

  electron.ipcRenderer.send('setAspectRatio', aspectRatio, {width: 0, height: HEADER_HEIGHT})
  electron.ipcRenderer.send('setBounds', {x, y, width, height})
}

function restoreBounds () {
  electron.ipcRenderer.send('setAspectRatio', 0)
  if (state.temp.mainWindowBounds) {
    electron.ipcRenderer.send('setBounds', state.temp.mainWindowBounds, true)
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
