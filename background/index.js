var createTorrent = require('create-torrent')
var electron = require('electron')
var path = require('path')
var prettyBytes = require('pretty-bytes')
var throttle = require('throttleit')
var thunky = require('thunky')
var torrentPoster = require('./torrent-poster')
var WebTorrent = require('webtorrent')
var xhr = require('xhr')

var ipc = electron.ipcRenderer

global.WEBTORRENT_ANNOUNCE = createTorrent.announceList
  .map(function (arr) {
    return arr[0]
  })
  .filter(function (url) {
    return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
  })

var getClient = thunky(function (cb) {
  getRtcConfig('https://instant.io/rtcConfig', function (err, rtcConfig) {
    if (err) onError(err)
    var client = window.client = new WebTorrent({
      rtcConfig: rtcConfig
    })
    client.on('warning', onWarning)
    client.on('error', onError)
    cb(null, client)
  })
})

function getRtcConfig (url, cb) {
  xhr(url, function (err, res) {
    if (err || res.statusCode !== 200) {
      cb(new Error('Could not get WebRTC config from server. Using default (without TURN).'))
    } else {
      var rtcConfig
      try {
        rtcConfig = JSON.parse(res.body)
      } catch (err) {
        return cb(
          new Error('Got invalid WebRTC config from server: ' + res.body)
        )
      }
      console.log('got rtc config: %o', rtcConfig)
      cb(null, rtcConfig)
    }
  })
}

// For performance, create the client immediately
getClient(function () {})

ipc.on('action', function (event, action, ...args) {
  console.log('action %s', action)
  if (action === 'addTorrent') {
    downloadTorrent(args[0])
  } else {
    throw new Error('unrecognized action ' + action)
  }
})

function downloadTorrent (torrentId) {
  console.log('Downloading torrent from %s', torrentId)
  getClient(function (err, client) {
    if (err) return onError(err)
    client.add(torrentId, onTorrent)
  })
}

function downloadTorrentFile (file) {
  console.log('Downloading torrent from <strong>' + file.name + '</strong>')
  getClient(function (err, client) {
    if (err) return onError(err)
    client.add(file, onTorrent)
  })
}

function seed (files) {
  if (files.length === 0) return
  console.log('Seeding ' + files.length + ' files')

  // Seed from WebTorrent
  getClient(function (err, client) {
    if (err) return onError(err)
    client.seed(files, onTorrent)
  })
}

function onTorrent (torrent) {
  console.log('done?', torrent.done)
  var torrentFileName = path.basename(torrent.name, path.extname(torrent.name)) + '.torrent'

  console.log('"' + torrentFileName + '" contains ' + torrent.files.length + ' files:')
  torrent.files.forEach(function (file) {
    console.log('&nbsp;&nbsp;- ' + file.name + ' (' + prettyBytes(file.length) + ')')
  })

  function updateSpeed () {
    ipc.send('')
    var progress = (100 * torrent.progress).toFixed(1)
    util.updateSpeed(
      '<b>Peers:</b> ' + torrent.swarm.wires.length + ' ' +
      '<b>Progress:</b> ' + progress + '% ' +
      '<b>Download speed:</b> ' + prettyBytes(window.client.downloadSpeed) + '/s ' +
      '<b>Upload speed:</b> ' + prettyBytes(window.client.uploadSpeed) + '/s'
    )
  }

  torrent.on('download', throttle(updateSpeed, 250))
  torrent.on('upload', throttle(updateSpeed, 250))
  setInterval(updateSpeed, 5000)
  updateSpeed()

  // torrentPoster(torrent, function (err, buf) {
  //   if (err) return onError(err)
  //   var img = document.createElement('img')
  //   img.src = URL.createObjectURL(new Blob([ buf ], { type: 'image/png' }))
  //   document.body.appendChild(img)
  // })
}

function onError (err) {
  console.error(err.stack)
}

function onWarning (err) {
  console.log('warning: ' + err.message)
}
