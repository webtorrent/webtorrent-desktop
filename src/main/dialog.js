module.exports = {
  openSeedFile,
  openSeedDirectory,
  openTorrentFile,
  openTorrentAddress,
  openFiles
}

var electron = require('electron')
var IntlMessageFormat = require('intl-messageformat')

var log = require('./log')
var windows = require('./windows')

/**
 * Show open dialog to create a single-file torrent.
 */
function openSeedFile () {
  if (!windows.main.win) return
  log('openSeedFile')

  // Defer i18n loading to access electron locale
  var i18n = require('../i18n')
  var opts = {
    title: new IntlMessageFormat(
      i18n.LOCALE_MESSAGES['dialog-seed-file'] || 'Select a file for the torrent.', i18n.LANGUAGE).format(),
    properties: [ 'openFile' ]
  }
  setTitle(opts.title)
  electron.dialog.showOpenDialog(windows.main.win, opts, function (selectedPaths) {
    resetTitle()
    if (!Array.isArray(selectedPaths)) return
    windows.main.dispatch('showCreateTorrent', selectedPaths)
  })
}

/*
 * Show open dialog to create a single-file or single-directory torrent. On
 * Windows and Linux, open dialogs are for files *or* directories only, not both,
 * so this function shows a directory dialog on those platforms.
 */
function openSeedDirectory () {
  if (!windows.main.win) return
  log('openSeedDirectory')

  // Defer i18n loading to access electron locale
  var i18n = require('../i18n')
  var opts = process.platform === 'darwin'
    ? {
      title: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['dialog-seed'] || 'Select a file or folder for the torrent.', i18n.LANGUAGE).format(),
      properties: [ 'openFile', 'openDirectory' ]
    }
    : {
      title: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['dialog-seed-folder'] || 'Select a folder for the torrent.', i18n.LANGUAGE).format(),
      properties: [ 'openDirectory' ]
    }
  setTitle(opts.title)
  electron.dialog.showOpenDialog(windows.main.win, opts, function (selectedPaths) {
    resetTitle()
    if (!Array.isArray(selectedPaths)) return
    windows.main.dispatch('showCreateTorrent', selectedPaths)
  })
}

/*
 * Show flexible open dialog that supports selecting .torrent files to add, or
 * a file or folder to create a single-file or single-directory torrent.
 */
function openFiles () {
  if (!windows.main.win) return
  log('openFiles')

  // Defer i18n loading to access electron locale
  var i18n = require('../i18n')
  var opts = process.platform === 'darwin'
    ? {
      title: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['dialog-open'] || 'Select a file or folder to add.', i18n.LANGUAGE).format(),
      properties: [ 'openFile', 'openDirectory' ]
    }
    : {
      title: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['dialog-open-file'] || 'Select a file to add.', i18n.LANGUAGE).format(),
      properties: [ 'openFile' ]
    }
  setTitle(opts.title)
  electron.dialog.showOpenDialog(windows.main.win, opts, function (selectedPaths) {
    resetTitle()
    if (!Array.isArray(selectedPaths)) return
    windows.main.dispatch('onOpen', selectedPaths)
  })
}

/*
 * Show open dialog to open a .torrent file.
 */
function openTorrentFile () {
  if (!windows.main.win) return
  log('openTorrentFile')

  // Defer i18n loading to access electron locale
  var i18n = require('../i18n')
  var opts = {
    title: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['dialog-open-torrent'] || 'Select a .torrent file.', i18n.LANGUAGE).format(),
    filters: [{ name: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['dialog-torrent-filter'] || 'Torrent Files', i18n.LANGUAGE).format(),
        extensions: ['torrent'] }],
    properties: [ 'openFile', 'multiSelections' ]
  }
  setTitle(opts.title)
  electron.dialog.showOpenDialog(windows.main.win, opts, function (selectedPaths) {
    resetTitle()
    if (!Array.isArray(selectedPaths)) return
    selectedPaths.forEach(function (selectedPath) {
      windows.main.dispatch('addTorrent', selectedPath)
    })
  })
}

/*
 * Show modal dialog to open a torrent URL (magnet uri, http torrent link, etc.)
 */
function openTorrentAddress () {
  log('openTorrentAddress')
  windows.main.dispatch('openTorrentAddress')
}

/**
 * Dialogs on do not show a title on Mac, so the window title is used instead.
 */
function setTitle (title) {
  if (process.platform === 'darwin') {
    windows.main.dispatch('setTitle', title)
  }
}

function resetTitle () {
  windows.main.dispatch('resetTitle')
}
