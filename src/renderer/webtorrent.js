// To keep the UI snappy, we run WebTorrent in its own hidden window, a separate
// process from the main window.
console.time('init')

const crypto = require('crypto')
const deepEqual = require('deep-equal')
const defaultAnnounceList = require('create-torrent').announceList
const electron = require('electron')
const fs = require('fs')
const mkdirp = require('mkdirp')
const musicmetadata = require('musicmetadata')
const networkAddress = require('network-address')
const path = require('path')
const WebTorrent = require('webtorrent')
const zeroFill = require('zero-fill')

const crashReporter = require('../crash-reporter')
const config = require('../config')
const {TorrentKeyNotFoundError} = require('./lib/errors')
const torrentPoster = require('./lib/torrent-poster')

// Report when the process crashes
crashReporter.init()

// Send & receive messages from the main window
const ipc = electron.ipcRenderer

// Force use of webtorrent trackers on all torrents
global.WEBTORRENT_ANNOUNCE = defaultAnnounceList
  .map((arr) => arr[0])
  .filter((url) => url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0)

/**
 * WebTorrent version.
 */
const VERSION = require('../../package.json').version

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102'
 */
const VERSION_STR = VERSION.match(/([0-9]+)/g)
  .slice(0, 2)
  .map((v) => zeroFill(2, v))
  .join('')

/**
 * Version prefix string (used in peer ID). WebTorrent uses the Azureus-style
 * encoding: '-', two characters for client id ('WW'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-WW0102-'...
 */
const VERSION_PREFIX = '-WD' + VERSION_STR + '-'

/**
 * Generate an ephemeral peer ID each time.
 */
const PEER_ID = Buffer.from(VERSION_PREFIX + crypto.randomBytes(9).toString('base64'))

// Connect to the WebTorrent and BitTorrent networks. WebTorrent Desktop is a hybrid
// client, as explained here: https://webtorrent.io/faq
let client = window.client = new WebTorrent({ peerId: PEER_ID })

// WebTorrent-to-HTTP streaming sever
let server = null

// Used for diffing, so we only send progress updates when necessary
let prevProgress = null

init()

function init () {
  listenToClientEvents()

  ipc.on('wt-start-torrenting', (e, torrentKey, torrentID, path, fileModtimes, selections) =>
    startTorrenting(torrentKey, torrentID, path, fileModtimes, selections))
  ipc.on('wt-stop-torrenting', (e, infoHash) =>
    stopTorrenting(infoHash))
  ipc.on('wt-create-torrent', (e, torrentKey, options) =>
    createTorrent(torrentKey, options))
  ipc.on('wt-save-torrent-file', (e, torrentKey) =>
    saveTorrentFile(torrentKey))
  ipc.on('wt-generate-torrent-poster', (e, torrentKey) =>
    generateTorrentPoster(torrentKey))
  ipc.on('wt-get-audio-metadata', (e, infoHash, index) =>
    getAudioMetadata(infoHash, index))
  ipc.on('wt-start-server', (e, infoHash) =>
    startServer(infoHash))
  ipc.on('wt-stop-server', (e) =>
    stopServer())
  ipc.on('wt-select-files', (e, infoHash, selections) =>
    selectFiles(infoHash, selections))

  ipc.send('ipcReadyWebTorrent')

  window.addEventListener('error', (e) =>
    ipc.send('wt-uncaught-error', {message: e.error.message, stack: e.error.stack}),
    true)

  setInterval(updateTorrentProgress, 1000)
  console.timeEnd('init')
}

function listenToClientEvents () {
  client.on('warning', (err) => ipc.send('wt-warning', null, err.message))
  client.on('error', (err) => ipc.send('wt-error', null, err.message))
}

// Starts a given TorrentID, which can be an infohash, magnet URI, etc.
// Returns a WebTorrent object. See https://git.io/vik9M
function startTorrenting (torrentKey, torrentID, path, fileModtimes, selections) {
  console.log('starting torrent %s: %s', torrentKey, torrentID)

  const torrent = client.add(torrentID, {
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
  const torrent = client.get(infoHash)
  if (torrent) torrent.destroy()
}

// Create a new torrent, start seeding
function createTorrent (torrentKey, options) {
  console.log('creating torrent', torrentKey, options)
  const paths = options.files.map((f) => f.path)
  const torrent = client.seed(paths, options)
  torrent.key = torrentKey
  addTorrentEvents(torrent)
  ipc.send('wt-new-torrent')
}

function addTorrentEvents (torrent) {
  torrent.on('warning', (err) =>
    ipc.send('wt-warning', torrent.key, err.message))
  torrent.on('error', (err) =>
    ipc.send('wt-error', torrent.key, err.message))
  torrent.on('infoHash', () =>
    ipc.send('wt-infohash', torrent.key, torrent.infoHash))
  torrent.on('metadata', torrentMetadata)
  torrent.on('ready', torrentReady)
  torrent.on('done', torrentDone)

  function torrentMetadata () {
    const info = getTorrentInfo(torrent)
    ipc.send('wt-metadata', torrent.key, info)

    updateTorrentProgress()
  }

  function torrentReady () {
    const info = getTorrentInfo(torrent)
    ipc.send('wt-ready', torrent.key, info)
    ipc.send('wt-ready-' + torrent.infoHash, torrent.key, info)

    updateTorrentProgress()
  }

  function torrentDone () {
    const info = getTorrentInfo(torrent)
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

// Every time we resolve a magnet URI, save the torrent file so that we can use
// it on next startup. Starting with the full torrent metadata will be faster
// than re-fetching it from peers using ut_metadata.
function saveTorrentFile (torrentKey) {
  const torrent = getTorrent(torrentKey)
  const torrentPath = path.join(config.TORRENT_PATH, torrent.infoHash + '.torrent')

  fs.access(torrentPath, fs.constants.R_OK, function (err) {
    const fileName = torrent.infoHash + '.torrent'
    if (!err) {
      // We've already saved the file
      return ipc.send('wt-file-saved', torrentKey, fileName)
    }

    // Otherwise, save the .torrent file, under the app config folder
    mkdirp(config.TORRENT_PATH, function (_) {
      fs.writeFile(torrentPath, torrent.torrentFile, function (err) {
        if (err) return console.log('error saving torrent file %s: %o', torrentPath, err)
        console.log('saved torrent file %s', torrentPath)
        return ipc.send('wt-file-saved', torrentKey, fileName)
      })
    })
  })
}

// Save a JPG that represents a torrent.
// Auto chooses either a frame from a video file, an image, etc
function generateTorrentPoster (torrentKey) {
  const torrent = getTorrent(torrentKey)
  torrentPoster(torrent, function (err, buf, extension) {
    if (err) return console.log('error generating poster: %o', err)
    // save it for next time
    mkdirp(config.POSTER_PATH, function (err) {
      if (err) return console.log('error creating poster dir: %o', err)
      const posterFileName = torrent.infoHash + extension
      const posterFilePath = path.join(config.POSTER_PATH, posterFileName)
      fs.writeFile(posterFilePath, buf, function (err) {
        if (err) return console.log('error saving poster: %o', err)
        // show the poster
        ipc.send('wt-poster', torrentKey, posterFileName)
      })
    })
  })
}

function updateTorrentProgress () {
  const progress = getTorrentProgress()
  // TODO: diff torrent-by-torrent, not once for the whole update
  if (prevProgress && deepEqual(progress, prevProgress, {strict: true})) {
    return /* don't send heavy object if it hasn't changed */
  }
  ipc.send('wt-progress', progress)
  prevProgress = progress
}

function getTorrentProgress () {
  // First, track overall progress
  const progress = client.progress
  const hasActiveTorrents = client.torrents.some(function (torrent) {
    return torrent.progress !== 1
  })

  // Track progress for every file in each torrent
  // TODO: ideally this would be tracked by WebTorrent, which could do it
  // more efficiently than looping over torrent.bitfield
  const torrentProg = client.torrents.map(function (torrent) {
    const fileProg = torrent.files && torrent.files.map(function (file, index) {
      const numPieces = file._endPiece - file._startPiece + 1
      let numPiecesPresent = 0
      for (let piece = file._startPiece; piece <= file._endPiece; piece++) {
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

function startServer (infoHash) {
  const torrent = client.get(infoHash)
  if (torrent.ready) startServerFromReadyTorrent(torrent)
  else torrent.once('ready', () => startServerFromReadyTorrent(torrent))
}

function startServerFromReadyTorrent (torrent, cb) {
  if (server) return

  // start the streaming torrent-to-http server
  server = torrent.createServer()
  server.listen(0, function () {
    const port = server.address().port
    const urlSuffix = ':' + port
    const info = {
      torrentKey: torrent.key,
      localURL: 'http://localhost' + urlSuffix,
      networkURL: 'http://' + networkAddress() + urlSuffix
    }

    ipc.send('wt-server-running', info)
    ipc.send('wt-server-' + torrent.infoHash, info)
  })
}

function stopServer () {
  if (!server) return
  server.destroy()
  server = null
}

function getAudioMetadata (infoHash, index) {
  const torrent = client.get(infoHash)
  const file = torrent.files[index]
  musicmetadata(file.createReadStream(), function (err, info) {
    if (err) return console.log('error getting audio metadata for ' + infoHash + ':' + index, err)
    const { artist, album, albumartist, title, year, track, disk, genre } = info
    const importantInfo = { artist, album, albumartist, title, year, track, disk, genre }
    console.log('got audio metadata for %s: %o', file.name, importantInfo)
    ipc.send('wt-audio-metadata', infoHash, index, importantInfo)
  })
}

function selectFiles (torrentOrInfoHash, selections) {
  // Get the torrent object
  let torrent
  if (typeof torrentOrInfoHash === 'string') {
    torrent = client.get(torrentOrInfoHash)
  } else {
    torrent = torrentOrInfoHash
  }
  if (!torrent) {
    throw new Error('selectFiles: missing torrent ' + torrentOrInfoHash)
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
  for (let i = 0; i < selections.length; i++) {
    const file = torrent.files[i]
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
  const ret = client.torrents.find((x) => x.key === torrentKey)
  if (!ret) throw new TorrentKeyNotFoundError(torrentKey)
  return ret
}

function onError (err) {
  console.log(err)
}

// TODO: remove this once the following bugs are fixed:
// https://bugs.chromium.org/p/chromium/issues/detail?id=490143
// https://github.com/electron/electron/issues/7212
window.testOfflineMode = function () {
  console.log('Test, going OFFLINE')
  client = window.client = new WebTorrent({
    peerId: PEER_ID,
    tracker: false,
    dht: false,
    webSeeds: false
  })
  listenToClientEvents()
}
