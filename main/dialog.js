module.exports = {
  openSeedFile,
  openSeedDirectory,
  openTorrentFile,
  openTorrentAddress
}

var electron = require('electron')
var windows = require('./windows')

/**
 * Show open dialog to create a single-file torrent.
 */
function openSeedFile () {
  var opts = {
    title: 'Select a file for the torrent file.',
    properties: [ 'openFile' ]
  }
  electron.dialog.showOpenDialog(opts, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    windows.main.send('dispatch', 'showCreateTorrent', selectedPaths)
  })
}

/*
 * Show open dialog to create a single-file or single-directory torrent. On
 * Windows and Linux, open dialogs are for files *or* directories only, not both.
 * This function shows a directory dialog.
 */
function openSeedDirectory () {
  var opts = {
    title: 'Select a file or folder for the torrent file.',
    properties: [ 'openFile', 'openDirectory' ]
  }
  electron.dialog.showOpenDialog(opts, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    windows.main.send('dispatch', 'showCreateTorrent', selectedPaths)
  })
}

/*
 * Show open dialog to open a .torrent file.
 */
function openTorrentFile () {
  var opts = {
    title: 'Select a .torrent file to open.',
    filters: [{ name: 'Torrent Files', extensions: ['torrent'] }],
    properties: [ 'openFile', 'multiSelections' ]
  }
  electron.dialog.showOpenDialog(windows.main.win, opts, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    selectedPaths.forEach(function (selectedPath) {
      windows.main.send('dispatch', 'addTorrent', selectedPath)
    })
  })
}

/*
 * Show modal dialog to open a torrent URL (magnet uri, http torrent link, etc.)
 */
function openTorrentAddress () {
  windows.main.send('showOpenTorrentAddress')
}
