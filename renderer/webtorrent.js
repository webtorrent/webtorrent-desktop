// To keep the UI snappy, we run WebTorrent in its own hidden window, a separate
// process from the main window.
console.time('init')

var WebTorrent = require('webtorrent')
var defaultAnnounceList = require('create-torrent').announceList
var deepEqual = require('deep-equal')
var electron = require('electron')
var fs = require('fs-extra')
var musicmetadata = require('musicmetadata')
var networkAddress = require('network-address')
var path = require('path')
var Opensubtitles = require('opensubtitles-api')

var crashReporter = require('../crash-reporter')
var config = require('../config')
var torrentPoster = require('./lib/torrent-poster')

// Report when the process crashes
crashReporter.init()

// Send & receive messages from the main window
var ipc = electron.ipcRenderer

// OpenSubtitles Api
var os = new Opensubtitles('OSTestUserAgent')

// Force use of webtorrent trackers on all torrents
global.WEBTORRENT_ANNOUNCE = defaultAnnounceList
  .map((arr) => arr[0])
  .filter((url) => url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0)

// Connect to the WebTorrent and BitTorrent networks. WebTorrent Desktop is a hybrid
// client, as explained here: https://webtorrent.io/faq
var client = new WebTorrent()

// WebTorrent-to-HTTP streaming sever
var server = null

// Used for diffing, so we only send progress updates when necessary
var prevProgress = null

init()

function init () {
  client.on('warning', (err) => ipc.send('wt-warning', null, err.message))
  client.on('error', (err) => ipc.send('wt-error', null, err.message))

  ipc.on('wt-start-torrenting', (e, torrentKey, torrentID, path, fileModtimes, selections) => startTorrenting(torrentKey, torrentID, path, fileModtimes, selections))
  ipc.on('wt-stop-torrenting', (e, infoHash) => stopTorrenting(infoHash))
  ipc.on('wt-create-torrent', (e, torrentKey, options) => createTorrent(torrentKey, options))
  ipc.on('wt-save-torrent-file', (e, torrentKey) => saveTorrentFile(torrentKey))
  ipc.on('wt-generate-torrent-poster', (e, torrentKey) => generateTorrentPoster(torrentKey))
  ipc.on('wt-get-audio-metadata', (e, infoHash, index) => getAudioMetadata(infoHash, index))
  ipc.on('wt-start-server', (e, infoHash, index) => startServer(infoHash, index))
  ipc.on('wt-stop-server', (e) => stopServer())
  ipc.on('wt-select-files', (e, infoHash, selections) => selectFiles(infoHash, selections))

  ipc.send('ipcReadyWebTorrent')

  window.addEventListener('error', (e) => ipc.send('wt-uncaught-error', {message: e.error.message, stack: e.error.stack}),
    true)

  setInterval(updateTorrentProgress, 1000)
}

// Starts a given TorrentID, which can be an infohash, magnet URI, etc. Returns WebTorrent object
// See https://github.com/feross/webtorrent/blob/master/docs/api.md#clientaddtorrentid-opts-function-ontorrent-torrent-
function startTorrenting (torrentKey, torrentID, path, fileModtimes, selections) {
  console.log('starting torrent %s: %s', torrentKey, torrentID)

  var torrent = client.add(torrentID, {
    path: path,
    fileModtimes: fileModtimes
  })
  torrent.key = torrentKey

  // Listen for ready event, progress notifications, etc
  addTorrentEvents(torrent)

  // Only download the files the user wants, not necessarily all files
  torrent.once('ready', () => selectFiles(torrent, selections))

  return torrent
}

function stopTorrenting (infoHash) {
  var torrent = client.get(infoHash)
  if (torrent) torrent.destroy()
}

// Create a new torrent, start seeding
function createTorrent (torrentKey, options) {
  console.log('creating torrent', torrentKey, options)
  var paths = options.files.map((f) => f.path)
  var torrent = client.seed(paths, options)
  torrent.key = torrentKey
  addTorrentEvents(torrent)
  ipc.send('wt-new-torrent')
}

function addTorrentEvents (torrent) {
  torrent.on('warning', (err) => ipc.send('wt-warning', torrent.key, err.message))
  torrent.on('error', (err) => ipc.send('wt-error', torrent.key, err.message))
  torrent.on('infoHash', () => ipc.send('wt-infohash', torrent.key, torrent.infoHash))
  torrent.on('metadata', torrentMetadata)
  torrent.on('ready', torrentReady)
  torrent.on('done', torrentDone)

  function torrentMetadata () {
    var info = getTorrentInfo(torrent)
    ipc.send('wt-metadata', torrent.key, info)

    updateTorrentProgress()
  }

  function torrentReady () {
    var info = getTorrentInfo(torrent)
    ipc.send('wt-ready', torrent.key, info)
    ipc.send('wt-ready-' + torrent.infoHash, torrent.key, info) // TODO: hack

    updateTorrentProgress()
  }

  function torrentDone () {
    var info = getTorrentInfo(torrent)
    ipc.send('wt-done', torrent.key, info)

    updateTorrentProgress()

    torrent.getFileModtimes(function (err, fileModtimes) {
      if (err) return onError(err)
      ipc.send('wt-file-modtimes', torrent.key, fileModtimes)
    })
  }
}

// Produces a JSON saveable summary of a torrent
function getTorrentInfo (torrent) {
  return {
    infoHash: torrent.infoHash,
    magnetURI: torrent.magnetURI,
    name: torrent.name,
    path: torrent.path,
    files: torrent.files.map(getTorrentFileInfo),
    bytesReceived: torrent.received
  }
}

// Produces a JSON saveable summary of a file in a torrent
function getTorrentFileInfo (file) {
  return {
    name: file.name,
    length: file.length,
    path: file.path
  }
}

// Every time we resolve a magnet URI, save the torrent file so that we never
// have to download it again. Never ask the DHT the same question twice.
function saveTorrentFile (torrentKey) {
  var torrent = getTorrent(torrentKey)
  checkIfTorrentFileExists(torrent.infoHash, function (torrentPath, exists) {
    var fileName = torrent.infoHash + '.torrent'
    if (exists) {
      // We've already saved the file
      return ipc.send('wt-file-saved', torrentKey, fileName)
    }

    // Otherwise, save the .torrent file, under the app config folder
    fs.mkdir(config.TORRENT_PATH, function (_) {
      fs.writeFile(torrentPath, torrent.torrentFile, function (err) {
        if (err) return console.log('error saving torrent file %s: %o', torrentPath, err)
        console.log('saved torrent file %s', torrentPath)
        return ipc.send('wt-file-saved', torrentKey, fileName)
      })
    })
  })
}

// Checks whether we've already resolved a given infohash to a torrent file
// Calls back with (torrentPath, exists). Logs, does not call back on error
function checkIfTorrentFileExists (infoHash, cb) {
  var torrentPath = path.join(config.TORRENT_PATH, infoHash + '.torrent')
  fs.exists(torrentPath, function (exists) {
    cb(torrentPath, exists)
  })
}

// Save a JPG that represents a torrent.
// Auto chooses either a frame from a video file, an image, etc
function generateTorrentPoster (torrentKey) {
  var torrent = getTorrent(torrentKey)
  torrentPoster(torrent, function (err, buf, extension) {
    if (err) return console.log('error generating poster: %o', err)
    // save it for next time
    fs.mkdirp(config.POSTER_PATH, function (err) {
      if (err) return console.log('error creating poster dir: %o', err)
      var posterFileName = torrent.infoHash + extension
      var posterFilePath = path.join(config.POSTER_PATH, posterFileName)
      fs.writeFile(posterFilePath, buf, function (err) {
        if (err) return console.log('error saving poster: %o', err)
        // show the poster
        ipc.send('wt-poster', torrentKey, posterFileName)
      })
    })
  })
}

function updateTorrentProgress () {
  var progress = getTorrentProgress()
  // TODO: diff torrent-by-torrent, not once for the whole update
  if (prevProgress && deepEqual(progress, prevProgress, {strict: true})) {
    return /* don't send heavy object if it hasn't changed */
  }
  ipc.send('wt-progress', progress)
  prevProgress = progress
}

function getTorrentProgress () {
  // First, track overall progress
  var progress = client.progress
  var hasActiveTorrents = client.torrents.some(function (torrent) {
    return torrent.progress !== 1
  })

  // Track progress for every file in each torrent
  // TODO: ideally this would be tracked by WebTorrent, which could do it
  // more efficiently than looping over torrent.bitfield
  var torrentProg = client.torrents.map(function (torrent) {
    var fileProg = torrent.files && torrent.files.map(function (file, index) {
      var numPieces = file._endPiece - file._startPiece + 1
      var numPiecesPresent = 0
      for (var piece = file._startPiece; piece <= file._endPiece; piece++) {
        if (torrent.bitfield.get(piece)) numPiecesPresent++
      }
      return {
        startPiece: file._startPiece,
        endPiece: file._endPiece,
        numPieces,
        numPiecesPresent
      }
    })
    return {
      torrentKey: torrent.key,
      ready: torrent.ready,
      progress: torrent.progress,
      downloaded: torrent.downloaded,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      numPeers: torrent.numPeers,
      length: torrent.length,
      bitfield: torrent.bitfield,
      files: fileProg
    }
  })

  return {
    torrents: torrentProg,
    progress,
    hasActiveTorrents
  }
}

function startServer (infoHash, index) {
  var torrent = client.get(infoHash)
  if (torrent.ready) startServerFromReadyTorrent(torrent, index)
  else torrent.once('ready', () => startServerFromReadyTorrent(torrent, index))
}

function startServerFromReadyTorrent (torrent, index, cb) {
  if (server) return

  // Donwload files subtitles
  torrent.files.forEach((file) => {
    getSubtitleHash(file).then(checksum => {
      // Getsubtitles from OpenSubtitles
      os.search({
        hash: checksum,
        filesize: file.length
        // need implement os-locale with ISO 639-2 table: http://www.loc.gov/standards/iso639-2/php/code_list.php
        // sublanguageid: 'pob'
      }).then(subtitles => {
        ipc.send('wt-subtitles-received', subtitles)
      })
    })
  })

  // start the streaming torrent-to-http server
  server = torrent.createServer()
  server.listen(0, function () {
    var port = server.address().port
    var urlSuffix = ':' + port + '/' + index
    var info = {
      torrentKey: torrent.key,
      localURL: 'http://localhost' + urlSuffix,
      networkURL: 'http://' + networkAddress() + urlSuffix
    }

    ipc.send('wt-server-running', info)
    ipc.send('wt-server-' + torrent.infoHash, info) // TODO: hack
  })
}

function stopServer () {
  if (!server) return
  server.destroy()
  server = null
}

function getAudioMetadata (infoHash, index) {
  var torrent = client.get(infoHash)
  var file = torrent.files[index]
  musicmetadata(file.createReadStream(), function (err, info) {
    if (err) return
    console.log('got audio metadata for %s: %o', file.name, info)
    ipc.send('wt-audio-metadata', infoHash, index, info)
  })
}

function selectFiles (torrentOrInfoHash, selections) {
  // Get the torrent object
  var torrent
  if (typeof torrentOrInfoHash === 'string') {
    torrent = client.get(torrentOrInfoHash)
  } else {
    torrent = torrentOrInfoHash
  }

  // Selections not specified?
  // Load all files. We still need to replace the default whole-torrent
  // selection with individual selections for each file, so we can
  // select/deselect files later on
  if (!selections) {
    selections = torrent.files.map((x) => true)
  }

  // Selections specified incorrectly?
  if (selections.length !== torrent.files.length) {
    throw new Error('got ' + selections.length + ' file selections, ' +
      'but the torrent contains ' + torrent.files.length + ' files')
  }

  // Remove default selection (whole torrent)
  torrent.deselect(0, torrent.pieces.length - 1, false)

  // Add selections (individual files)
  for (var i = 0; i < selections.length; i++) {
    var file = torrent.files[i]
    if (selections[i]) {
      file.select()
    } else {
      console.log('deselecting file ' + i + ' of torrent ' + torrent.name)
      file.deselect()
    }
  }
}

// Gets a WebTorrent handle by torrentKey
// Throws an Error if we're not currently torrenting anything w/ that key
function getTorrent (torrentKey) {
  var ret = client.torrents.find((x) => x.key === torrentKey)
  if (!ret) throw new Error('missing torrent key ' + torrentKey)
  return ret
}

function onError (err) {
  console.log(err)
}

// Generate hash from file torrent
function getSubtitleHash (fileTorrent) {
  return new Promise((resolve, reject) => {
    let chunkSize = 65536 // 1024 * 64
    let fileSize = fileTorrent.length
    let lengthBytes = 131072 // chunkSize * 2

    let startStream = fileTorrent.createReadStream({start: 0, end: lengthBytes - 1})
    let endStream = fileTorrent.createReadStream({start: (fileSize - chunkSize), end: fileSize})

    Promise.all([checksumStream(startStream, lengthBytes), checksumStream(endStream, lengthBytes)])
      .then((checksuns) => {
        let checksum = sumChecksuns(checksuns, fileSize)
        resolve(checksum)
      }).catch(reject)
  })
}

// calculate hex sum between checksuns
function sumChecksuns (checksuns, fileSize) {
  let checksum = sumHex64bits(fileSize.toString(16), checksuns[0])
  checksum = sumHex64bits(checksum, checksuns[1])
  checksum = checksum.substr(-16)
  checksum = padLeft(checksum, '0', 16)
  return checksum
}

// compute checksum of the buffer splitting by chunk of lengths bits
function checksumBuffer (buf, length) {
  let checksum = 0
  let checksumHex = 0
  for (let i = 0; i < (buf.length / length); i++) {
    checksumHex = read64LE(buf, i)
    checksum = sumHex64bits(checksum.toString(), checksumHex).substr(-16)
  }
  return checksum
}

// get checksum from readable stream
function checksumStream (stream, defaultsize) {
  return new Promise(function (resolve, reject) {
    let bufs = []
    stream.on('data', function (data) {
      bufs.push(data)
    }).on('end', function () {
      let buffer = new Buffer(defaultsize)
      Buffer.concat(bufs).copy(buffer)
      let checksum = checksumBuffer(buffer, 16)
      resolve(checksum)
    }).on('error', reject)
  })
}

// read 64 bits from buffer starting at offset as LITTLE ENDIAN hex
function read64LE (buffer, offset) {
  var ret64be = buffer.toString('hex', offset * 8, ((offset + 1) * 8))
  var array = []
  for (var i = 0; i < 8; i++) {
    array.push(ret64be.substr(i * 2, 2))
  }
  array.reverse()
  return array.join('')
}

// calculate hex sum between 2 64bits hex numbers
function sumHex64bits (n1, n2) {
  if (n1.length < 16) n1 = padLeft(n1, '0', 16)

  if (n2.length < 16) n2 = padLeft(n2, '0', 16)

  // 1st 32 bits
  let n10 = n1.substr(0, 8)
  let n20 = n2.substr(0, 8)
  let i0 = parseInt(n10, 16) + parseInt(n20, 16)

  // 2nd 32 bits
  let n11 = n1.substr(8, 8)
  let n21 = n2.substr(8, 8)
  let i1 = parseInt(n11, 16) + parseInt(n21, 16)

  // back to hex
  let h1 = i1.toString(16)
  let i1Over = 0
  if (h1.length > 8) {
    i1Over = parseInt(h1.substr(0, h1.length - 8), 16)
  } else {
    h1 = padLeft(h1, '0', 8)
  }
  let h0 = (i1Over + i0).toString(16)
  return h0 + h1.substr(-8)
}

// pad left with c up to length characters
function padLeft (str, c, length) {
  while (str.length < length) str = c.toString() + str
  return str
}
