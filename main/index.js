/* global URL, Blob */

// var prettyBytes = require('pretty-bytes')
var torrentPoster = require('./lib/torrent-poster')
var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var path = require('path')
var throttle = require('throttleit')
var thunky = require('thunky')
var WebTorrent = require('webtorrent')
var xhr = require('xhr')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var App = require('./views/app')

global.WEBTORRENT_ANNOUNCE = createTorrent.announceList
  .map(function (arr) {
    return arr[0]
  })
  .filter(function (url) {
    return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
  })

var state = global.state = {
  torrents: []
}

var currentVDom, rootElement, getClient, updateThrottled

function init () {
  currentVDom = App(state, handler)
  rootElement = createElement(currentVDom)
  document.body.appendChild(rootElement)

  updateThrottled = throttle(update, 250)

  getClient = thunky(function (cb) {
    getRtcConfig('https://instant.io/rtcConfig', function (err, rtcConfig) {
      if (err) console.error(err)
      var client = global.client = new WebTorrent({ rtcConfig: rtcConfig })
      state.torrents = client.torrents // internal webtorrent array -- do not modify!
      client.on('warning', onWarning)
      client.on('error', onError)
      cb(null, client)
    })
  })

  // For performance, create the client immediately
  getClient(function () {})

  dragDrop('body', onFiles)
}
init()

function update () {
  console.log('update')
  var newVDom = App(state, handler)
  var patches = diff(currentVDom, newVDom)
  rootElement = patch(rootElement, patches)
  currentVDom = newVDom
}

function handler (action, ...args) {
  console.log('handler: %s %o', action, args)
  if (action === 'addTorrent') {
    var torrentId = args[0]
    addTorrent(torrentId)
  }
  if (action === 'openPlayer') {
    var torrent = args[0]
    openPlayer(torrent)
  }
  if (action === 'closePlayer') {
    closePlayer()
  }
}
addTorrent()

function onFiles (files) {
  // .torrent file = start downloading the torrent
  files.filter(isTorrentFile).forEach(addTorrent)

  // everything else = seed these files
  seed(files.filter(isNotTorrentFile))
}

function isTorrentFile (file) {
  var extname = path.extname(file.name).toLowerCase()
  return extname === '.torrent'
}

function isNotTorrentFile (file) {
  return !isTorrentFile(file)
}

function getRtcConfig (url, cb) {
  xhr(url, function (err, res) {
    if (err || res.statusCode !== 200) {
      cb(new Error('Could not get WebRTC config from server. Using default (without TURN).'))
    } else {
      var rtcConfig
      try { rtcConfig = JSON.parse(res.body) } catch (err) {}
      if (rtcConfig) {
        console.log('got rtc config: %o', rtcConfig)
        cb(null, rtcConfig)
      } else {
        cb(new Error('Got invalid WebRTC config from server: ' + res.body))
      }
    }
  })
}

function addTorrent (torrentId) {
  console.log('Downloading torrent from %s', torrentId)
  getClient(function (err, client) {
    if (err) return onError(err)
    var torrent = client.add(torrentId)
    addTorrentEvents(torrent)
  })
}

function seed (files) {
  if (files.length === 0) return
  console.log('Seeding ' + files.length + ' files')

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
    console.log(torrent.posterURL)
    update()
  })
  update()
}

function openPlayer (torrent) {
  var server = torrent.createServer()
  server.listen(0, function () {
    var port = server.address().port
    state.player = {
      server: server,
      url: 'http://localhost:' + port + '/0'
    }
    update()
  })
}

function closePlayer () {
  state.player.server.destroy()
  state.player = null
  update()
}

// function onTorrent (torrent) {
  // function updateSpeed () {
  //   ipc.send('')
  //   var progress = (100 * torrent.progress).toFixed(1)
  //   util.updateSpeed(
  //     '<b>Peers:</b> ' + torrent.swarm.wires.length + ' ' +
  //     '<b>Progress:</b> ' + progress + '% ' +
  //     '<b>Download speed:</b> ' + prettyBytes(window.client.downloadSpeed) + '/s ' +
  //     '<b>Upload speed:</b> ' + prettyBytes(window.client.uploadSpeed) + '/s'
  //   )
  // }

  // setInterval(updateSpeed, 5000)
  // updateSpeed()
// }

function onError (err) {
  console.error(err.stack)
  window.alert(err.message || err)
}

function onWarning (err) {
  console.log('warning: %s', err.message)
}

// Seed via upload input element
// var uploadElement = require('upload-element')
// var upload = document.querySelector('input[name=upload]')
// uploadElement(upload, function (err, files) {
//   if (err) return onError(err)
//   files = files.map(function (file) { return file.file })
//   onFiles(files)
// })

// Download via input element
// document.querySelector('form').addEventListener('submit', function (e) {
//   e.preventDefault()
//   addTorrent(document.querySelector('form input[name=torrentId]').value.trim())
// })
