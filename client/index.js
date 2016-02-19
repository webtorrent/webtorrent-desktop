var debug = require('debug/browser')('app:client')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var dragDrop = require('drag-drop')
var electron = require('electron')
var patch = require('virtual-dom/patch')

var ipc = electron.ipcRenderer

var App = require('./views/app')

var state = {
  torrents: [
    { name: 'Torrent 1' },
    { name: 'Torrent 2' }
  ]
}

var currentVDom = App(state, handler)
var rootElement = createElement(currentVDom)
document.body.appendChild(rootElement)

function update () {
  debug('update')
  var newVDom = App(state, handler)
  var patches = diff(currentVDom, newVDom)
  rootElement = patch(rootElement, patches)
  currentVDom = newVDom
}

function handler (action, ...args) {
  debug('handler: %s', action)
  ipc.send('action', action, ...args)
}

// Seed via drag-and-drop
dragDrop('body', onFiles)

function onFiles (files) {
  debug('got files:')
  files.forEach(function (file) {
    debug(' - %s (%s bytes)', file.name, file.size)
  })

  // .torrent file = start downloading the torrent
  files.filter(isTorrentFile).forEach(downloadTorrentFile)

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
//   downloadTorrent(document.querySelector('form input[name=torrentId]').value.trim())
// })
