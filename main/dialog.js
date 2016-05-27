module.exports = {
  openSeedFile,
  openSeedDirectory,
  openTorrentFile,
  openTorrentAddress
}

var electron = require('electron')
var windows = require('./windows')

// Prompts the user for a file, then creates a torrent. Only allows a single file
// selection.
function openSeedFile () {
  electron.dialog.showOpenDialog({
    title: 'Select a file for the torrent file.',
    properties: [ 'openFile' ]
  }, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    windows.main.send('dispatch', 'showCreateTorrent', selectedPaths)
  })
}

// Prompts the user for a file or directory, then creates a torrent. Only allows a
// single selection. To create a multi-file torrent, the user must select a
// directory.
function openSeedDirectory () {
  electron.dialog.showOpenDialog({
    title: 'Select a file or folder for the torrent file.',
    properties: [ 'openFile', 'openDirectory' ]
  }, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    windows.main.send('dispatch', 'showCreateTorrent', selectedPaths)
  })
}

// Prompts the user to choose a torrent file, then adds it.
function openTorrentFile () {
  electron.dialog.showOpenDialog(windows.main.win, {
    title: 'Select a .torrent file to open.',
    filters: [{ name: 'Torrent Files', extensions: ['torrent'] }],
    properties: [ 'openFile', 'multiSelections' ]
  }, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    selectedPaths.forEach(function (selectedPath) {
      windows.main.send('dispatch', 'addTorrent', selectedPath)
    })
  })
}

// Prompts the user for the URL of a torrent file, then downloads and adds it
function openTorrentAddress () {
  windows.main.send('showOpenTorrentAddress')
}
