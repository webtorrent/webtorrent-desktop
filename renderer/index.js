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
var state = require('./state')
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

var vdomLoop, updateThrottled

function init () {
  state.client = new WebTorrent()
  state.client.on('warning', onWarning)
  state.client.on('error', onError)

  state.saved.torrents.forEach(function (torrent) {
    state.client.add(torrent.torrentFile)
  })

  // For easy debugging in Developer Tools
  global.state = state

  vdomLoop = mainLoop(state, render, {
    create: createElement,
    diff: diff,
    patch: patch
  })
  document.body.appendChild(vdomLoop.target)

  updateThrottled = throttle(update, 1000)

  dragDrop('body', onFiles)

  chromecasts.on('update', function (player) {
    state.devices.chromecast = player
    update()
  })

  airplay.createBrowser().on('deviceOn', function (player) {
    state.devices.airplay = player
  }).start()

  document.addEventListener('paste', function () {
    electron.ipcRenderer.send('addTorrentFromPaste')
  })

  document.addEventListener('keydown', function (e) {
    if (e.which === 27) { /* ESC means either exit fullscreen or go back */
      if (state.isFullScreen) {
        dispatch('toggleFullScreen')
      } else {
        dispatch('back')
      }
    }
  })

  window.addEventListener('focus', function () {
    state.isFocused = true
    if (state.dock.badge > 0) electron.ipcRenderer.send('setBadge', '')
    state.dock.badge = 0
  })

  window.addEventListener('blur', function () {
    state.isFocused = false
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
  var progress = state.client.progress
  var activeTorrentsExist = state.client.torrents.some(function (torrent) {
    return torrent.progress !== 1
  })
  // Hide progress bar when client has no torrents, or progress is 100%
  if (!activeTorrentsExist || progress === 1) {
    progress = -1
  }
  if (progress !== state.dock.progress) {
    state.dock.progress = progress
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
    // TODO
    // window.history.back()
    if (state.url === '/player') {
      restoreBounds()
      closeServer()
    }
    state.url = '/'
    update()
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
    electron.ipcRenderer.send('toggleFullScreen')
    update()
  }
  if (action === 'videoMouseMoved') {
    state.video.mouseStationarySince = new Date().getTime()
    update()
  }
}

electron.ipcRenderer.on('addTorrent', function (e, torrentId) {
  dispatch('addTorrent', torrentId)
})

electron.ipcRenderer.on('seed', function (e, files) {
  dispatch('seed', files)
})

electron.ipcRenderer.on('fullscreenChanged', function (e, isFullScreen) {
  state.isFullScreen = isFullScreen
  update()
})

electron.ipcRenderer.on('addFakeDevice', function (e, device) {
  var player = new EventEmitter()
  player.play = (networkURL) => console.log(networkURL)
  state.devices[device] = player
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
  if (!torrentId) torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4'
  var torrent = state.client.add(torrentId)
  addTorrentEvents(torrent)
}

function seed (files) {
  if (files.length === 0) return
  var torrent = state.client.seed(files)
  addTorrentEvents(torrent)
}

function addTorrentEvents (torrent) {
  torrent.on('infoHash', update)
  torrent.on('download', updateThrottled)
  torrent.on('upload', updateThrottled)

  torrent.on('ready', torrentReady)
  torrent.on('done', torrentDone)

  update()

  function torrentReady () {
    torrentPoster(torrent, function (err, buf) {
      if (err) return onWarning(err)
      torrent.posterURL = URL.createObjectURL(new Blob([ buf ], { type: 'image/png' }))
      update()
    })
    update()
  }

  function torrentDone () {
    if (!state.isFocused) {
      state.dock.badge += 1
      electron.ipcRenderer.send('setBadge', state.dock.badge)
    }
    update()
  }
}

function startServer (torrent, cb) {
  if (state.server) return cb()

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

function closeServer () {
  state.server.server.destroy()
  state.server = null
}

function openPlayer (torrent) {
  startServer(torrent, function () {
    state.url = '/player'
    update()
  })
}

function deleteTorrent (torrent) {
  torrent.destroy(update)
}

function openChromecast (torrent) {
  startServer(torrent, function () {
    state.devices.chromecast.play(state.server.networkURL, {
      title: 'WebTorrent — ' + torrent.name
    })
    state.devices.chromecast.on('error', function (err) {
      err.message = 'Chromecast: ' + err.message
      onError(err)
    })
    update()
  })
}

function openAirplay (torrent) {
  startServer(torrent, function () {
    state.devices.airplay.play(state.server.networkURL, 0, function () {
      // TODO: handle airplay errors
    })
    update()
  })
}

function setDimensions (dimensions) {
  // TODO: eliminate blocking remote call
  state.mainWindowBounds = electron.remote.getCurrentWindow().getBounds()

  // Limit window size to screen size
  var workAreaSize = electron.remote.screen.getPrimaryDisplay().workAreaSize
  var aspectRatio = dimensions.width / dimensions.height

  var scaleFactor = Math.min(
    Math.min(workAreaSize.width / dimensions.width, 1),
    Math.min(workAreaSize.height / dimensions.height, 1)
  )

  var width = Math.floor(dimensions.width * scaleFactor)
  var height = Math.floor(dimensions.height * scaleFactor)

  // Video player header only shows in OSX where it's part of the title bar. See app.js
  if (process.platform === 'darwin') {
    height += HEADER_HEIGHT
  }

  // Center window on screen
  var x = Math.floor((workAreaSize.width - width) / 2)
  var y = Math.floor((workAreaSize.height - height) / 2)

  electron.ipcRenderer.send('setAspectRatio', aspectRatio, {width: 0, height: HEADER_HEIGHT})
  electron.ipcRenderer.send('setBounds', {x, y, width, height})
}

function restoreBounds () {
  electron.ipcRenderer.send('setAspectRatio', 0)
  if (state.mainWindowBounds) {
    electron.ipcRenderer.send('setBounds', state.mainWindowBounds, true)
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
