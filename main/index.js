/* global URL, Blob */

var airplay = require('airplay-js')
var chromecasts = require('chromecasts')()
var dragDrop = require('drag-drop')
var electron = require('electron')
var networkAddress = require('network-address')
var path = require('path')
var throttle = require('throttleit')
var torrentPoster = require('./lib/torrent-poster')
var getClient = require('./lib/get-client')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var HEADER_HEIGHT = 38

var App = require('./views/app')

var state = global.state = {
  server: null,
  player: null,
  currentPage: {
    type: 'list'
  },
  view: {
    title: 'WebTorrent',
    client: null,
    savedWindowBounds: null,
    history: [],
    historyIndex: 0,
    chromecast: null,
    airplay: null
  }
}

var currentVDom, rootElement, updateThrottled

function init () {
  currentVDom = App(state, dispatch)
  rootElement = createElement(currentVDom)
  document.body.appendChild(rootElement)

  updateThrottled = throttle(update, 250)

  getClient(function (err, client) {
    if (err) return onError(err)
    global.client = client
    state.view.client = client
    client.on('warning', onWarning)
    client.on('error', onError)
  })

  dragDrop('body', onFiles)

  chromecasts.on('update', function (player) {
    state.view.chromecast = player
    update()
  })

  airplay.createBrowser().on('deviceOn', function (player) {
    state.view.airplay = player
  }).start()

  document.addEventListener('paste', function () {
    electron.ipcRenderer.send('addTorrentFromPaste')
  })
}
init()

function update () {
  var newVDom = App(state, dispatch)
  var patches = diff(currentVDom, newVDom)
  rootElement = patch(rootElement, patches)
  currentVDom = newVDom
}

setInterval(function () {
  update()
}, 5000)

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
  // if (action === 'closePlayer') {
  //   closePlayer()
  // }
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
    if (state.player === 'local') {
      restoreBounds()
      closePlayer()
    }
  }
}

electron.ipcRenderer.on('addTorrent', function (e, torrentId) {
  addTorrent(torrentId)
})

electron.ipcRenderer.on('seed', function (e, files) {
  seed(files)
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
  getClient(function (err, client) {
    if (err) return onError(err)
    var torrent = client.add(torrentId)
    addTorrentEvents(torrent)
  })
}

function seed (files) {
  if (files.length === 0) return

  // Seed from WebTorrent
  getClient(function (err, client) {
    if (err) return onError(err)
    var torrent = client.seed(files)
    addTorrentEvents(torrent)
  })
}

function addTorrentEvents (torrent) {
  torrent.on('infoHash', update)
  torrent.on('done', update)
  torrent.on('download', updateThrottled)
  torrent.on('upload', updateThrottled)
  torrent.on('ready', function () {
    torrentReady(torrent)
  })
  update()
}

function torrentReady (torrent) {
  torrentPoster(torrent, function (err, buf) {
    if (err) return onError(err)
    torrent.posterURL = URL.createObjectURL(new Blob([ buf ], { type: 'image/png' }))
    update()
  })
  update()
}

function startServer (torrent, cb) {
  // use largest file
  var index = torrent.files.indexOf(torrent.files.reduce(function (a, b) {
    return a.length > b.length ? a : b
  }))

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
    state.player = 'local'
    update()
  })
}

function closePlayer () {
  closeServer()
  state.player = null
  update()
}

function openChromecast (torrent) {
  startServer(torrent, function () {
    state.view.chromecast.play(state.server.networkURL, { title: 'WebTorrent — ' + torrent.name })
    state.view.chromecast.on('error', function (err) {
      err.message = 'Chromecast: ' + err.message
      onError(err)
    })
    state.player = 'chromecast'
    update()
  })
}

function openAirplay (torrent) {
  startServer(torrent, function () {
    state.view.airplay.play(state.server.networkURL, 0, function () {})
    // TODO: handle airplay errors
    state.player = 'airplay'
    update()
  })
}

function setDimensions (dimensions) {
  state.view.savedWindowBounds = electron.remote.getCurrentWindow().getBounds()

  // Limit window size to screen size
  var workAreaSize = electron.remote.screen.getPrimaryDisplay().workAreaSize
  var width = Math.min(dimensions.width, workAreaSize.width)
  var height = Math.min(dimensions.height, workAreaSize.height)
  var aspectRatio = width / height

  // add header height
  height += HEADER_HEIGHT

  // Center window on screen
  var x = Math.floor((workAreaSize.width - width) / 2)
  var y = Math.floor((workAreaSize.height - height) / 2)

  electron.ipcRenderer.send('setAspectRatio', aspectRatio, { width: 0, height: HEADER_HEIGHT })
  electron.ipcRenderer.send('setBounds', { x, y, width, height })
}

function restoreBounds () {
  electron.ipcRenderer.send('setAspectRatio', 0)
  electron.ipcRenderer.send('setBounds', state.view.savedWindowBounds, true)
}

function onError (err) {
  console.error(err.stack)
  window.alert(err.message || err)
  update()
}

function onWarning (err) {
  console.log('warning: %s', err.message)
}
