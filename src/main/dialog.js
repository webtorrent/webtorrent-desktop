import electron from '../../electron.cjs'
import log from './log.js'
import * as windows from './windows/index.js'

const { dialog } = electron

/**
 * Show open dialog to create a single-file torrent.
 */
export function openSeedFile () {
  if (!windows.main.win) return
  log('openSeedFile')
  const opts = {
    title: 'Select a file for the torrent.',
    properties: ['openFile']
  }
  showOpenSeed(opts)
}

/*
 * Show open dialog to create a single-file or single-directory torrent. On
 * Windows and Linux, open dialogs are for files *or* directories only, not both,
 * so this function shows a directory dialog on those platforms.
 */
export function openSeedDirectory () {
  if (!windows.main.win) return
  log('openSeedDirectory')
  const opts = process.platform === 'darwin'
    ? {
        title: 'Select a file or folder for the torrent.',
        properties: ['openFile', 'openDirectory']
      }
    : {
        title: 'Select a folder for the torrent.',
        properties: ['openDirectory']
      }
  showOpenSeed(opts)
}

/*
 * Show flexible open dialog that supports selecting .torrent files to add, or
 * a file or folder to create a single-file or single-directory torrent.
 */
export function openFiles () {
  if (!windows.main.win) return
  log('openFiles')
  const opts = process.platform === 'darwin'
    ? {
        title: 'Select a file or folder to add.',
        properties: ['openFile', 'openDirectory']
      }
    : {
        title: 'Select a file to add.',
        properties: ['openFile']
      }
  setTitle(opts.title)
  const selectedPaths = dialog.showOpenDialogSync(windows.main.win, opts)
  resetTitle()
  if (!Array.isArray(selectedPaths)) return
  windows.main.dispatch('onOpen', selectedPaths)
}

/*
 * Show open dialog to open a .torrent file.
 */
export function openTorrentFile () {
  if (!windows.main.win) return
  log('openTorrentFile')
  const opts = {
    title: 'Select a .torrent file.',
    filters: [{ name: 'Torrent Files', extensions: ['torrent'] }],
    properties: ['openFile', 'multiSelections']
  }
  setTitle(opts.title)
  const selectedPaths = dialog.showOpenDialogSync(windows.main.win, opts)
  resetTitle()
  if (!Array.isArray(selectedPaths)) return
  selectedPaths.forEach(selectedPath => {
    windows.main.dispatch('addTorrent', selectedPath)
  })
}

/*
 * Show modal dialog to open a torrent URL (magnet uri, http torrent link, etc.)
 */
export function openTorrentAddress () {
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

/**
 * Pops up an Open File dialog with the given options.
 * After the user selects files / folders, shows the Create Torrent page.
 */
function showOpenSeed (opts) {
  setTitle(opts.title)
  const selectedPaths = dialog.showOpenDialogSync(windows.main.win, opts)
  resetTitle()
  if (!Array.isArray(selectedPaths)) return
  windows.main.dispatch('showCreateTorrent', selectedPaths)
}
