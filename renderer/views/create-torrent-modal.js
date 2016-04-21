module.exports = UpdateAvailableModal

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var path = require('path')

var {dispatch} = require('../lib/dispatcher')

function UpdateAvailableModal (state) {
  var info = state.modal

  // First, extract the base folder that the files are all in
  var files = info.files
  var pathPrefix = info.folderPath
  if (!pathPrefix) {
    if (files.length > 0) {
      pathPrefix = files.map((x) => x.path).reduce(findCommonPrefix)
      if (!pathPrefix.endsWith('/') && !pathPrefix.endsWith('\\')) {
        pathPrefix = path.dirname(pathPrefix)
      }
    } else {
      pathPrefix = files[0]
    }
  }

  // Then, use the name of the base folder (or sole file, for a single file torrent)
  // as the default name. Show all files relative to the base folder.
  var defaultName = path.basename(pathPrefix)
  var basePath = path.dirname(pathPrefix)
  var fileElems = files.map(function (file) {
    var relativePath = files.length === 0 ? file.name : path.relative(pathPrefix, file.path)
    return hx`<div>${relativePath}</div>`
  })

  return hx`
    <div class='create-torrent-modal'>
      <p><strong>Create New Torrent</strong></p>
      <p class='torrent-attribute'>
        <label>Name:</label>
        <div class='torrent-attribute'>${defaultName}</div>
      </p>
      <p class='torrent-attribute'>
        <label>Path:</label>
        <div class='torrent-attribute'>${pathPrefix}</div>
      </p>
      <p class='torrent-attribute'>
        <label>Files:</label>
        <div>${fileElems}</div>
      </p>
      <p>
        <button class='primary' onclick=${handleOK}>Create Torrent</button>
        <button class='cancel' onclick=${handleCancel}>Cancel</button>
      </p>
    </div>
  `

  function handleOK () {
    var options = {
      // TODO: we can't let the user choose their own name if we want WebTorrent
      // to use the files in place rather than creating a new folder.
      // name: document.querySelector('.torrent-name').value
      name: defaultName,
      path: basePath,
      files: files
    }
    dispatch('createTorrent', options)
    dispatch('exitModal')
  }

  function handleCancel () {
    dispatch('exitModal')
  }
}

// Finds the longest common prefix
function findCommonPrefix (a, b) {
  for (var i = 0; i < a.length && i < b.length; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) break
  }
  if (i === a.length) return a
  if (i === b.length) return b
  return a.substring(0, i)
}
