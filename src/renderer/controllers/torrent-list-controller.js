const fs = require('fs')
const path = require('path')
const electron = require('electron')

const {dispatch} = require('../lib/dispatcher')
const {TorrentKeyNotFoundError} = require('../lib/errors')
const sound = require('../lib/sound')
const TorrentSummary = require('../lib/torrent-summary')

const ipcRenderer = electron.ipcRenderer

const instantIoRegex = /^(https:\/\/)?instant\.io\/#/

// Controls the torrent list: creating, adding, deleting, & manipulating torrents
module.exports = class TorrentListController {
  constructor (state) {
    this.state = state
  }

  // Adds a torrent to the list, starts downloading/seeding.
  // TorrentID can be a magnet URI, infohash, or torrent file: https://git.io/vik9M
  addTorrent (torrentId) {
    if (torrentId.path) {
      // Use path string instead of W3C File object
      torrentId = torrentId.path
    }

    // Trim extra spaces off pasted magnet links
    if (typeof torrentId === 'string') {
      torrentId = torrentId.trim()
    }

    // Allow a instant.io link to be pasted
    if (typeof torrentId === 'string' && instantIoRegex.test(torrentId)) {
      torrentId = torrentId.slice(torrentId.indexOf('#') + 1)
    }

    const torrentKey = this.state.nextTorrentKey++
    const path = this.state.saved.prefs.downloadPath

    ipcRenderer.send('wt-start-torrenting', torrentKey, torrentId, path)

    dispatch('backToList')
  }

  // Shows the Create Torrent page with options to seed a given file or folder
  showCreateTorrent (files) {
    // You can only create torrents from the home screen.
    if (this.state.location.url() !== 'home') {
      return dispatch('error', 'Please go back to the torrent list before creating a new torrent.')
    }

    // Files will either be an array of file objects, which we can send directly
    // to the create-torrent screen
    if (files.length === 0 || typeof files[0] !== 'string') {
      this.state.location.go({
        url: 'create-torrent',
        files: files,
        setup: (cb) => {
          this.state.window.title = 'Create New Torrent'
          cb(null)
        }
      })
      return
    }

    // ... or it will be an array of mixed file and folder paths. We have to walk
    // through all the folders and find the files
    findFilesRecursive(files, (allFiles) => this.showCreateTorrent(allFiles))
  }

  // Creates a new torrent and start seeeding
  createTorrent (options) {
    const state = this.state
    const torrentKey = state.nextTorrentKey++
    ipcRenderer.send('wt-create-torrent', torrentKey, options)
    state.location.cancel()
  }

  // Starts downloading and/or seeding a given torrentSummary.
  startTorrentingSummary (torrentKey) {
    const s = TorrentSummary.getByKey(this.state, torrentKey)
    if (!s) throw new TorrentKeyNotFoundError(torrentKey)

    // New torrent: give it a path
    if (!s.path) {
      // Use Downloads folder by default
      s.path = this.state.saved.prefs.downloadPath
      return start()
    }

    const fileOrFolder = TorrentSummary.getFileOrFolder(s)

    // New torrent: metadata not yet received
    if (!fileOrFolder) return start()

    // Existing torrent: check that the path is still there
    fs.stat(fileOrFolder, function (err) {
      if (err) {
        s.error = 'path-missing'
        dispatch('backToList')
        return
      }
      start()
    })

    function start () {
      ipcRenderer.send('wt-start-torrenting',
        s.torrentKey,
        TorrentSummary.getTorrentId(s),
        s.path,
        s.fileModtimes,
        s.selections)
    }
  }

  // TODO: use torrentKey, not infoHash
  toggleTorrent (infoHash) {
    const torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    if (torrentSummary.status === 'paused') {
      torrentSummary.status = 'new'
      this.startTorrentingSummary(torrentSummary.torrentKey)
      sound.play('ENABLE')
    } else {
      torrentSummary.status = 'paused'
      ipcRenderer.send('wt-stop-torrenting', torrentSummary.infoHash)
      sound.play('DISABLE')
    }
  }

  toggleTorrentFile (infoHash, index) {
    const torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    torrentSummary.selections[index] = !torrentSummary.selections[index]

    // Let the WebTorrent process know to start or stop fetching that file
    if (torrentSummary.status !== 'paused') {
      ipcRenderer.send('wt-select-files', infoHash, torrentSummary.selections)
    }
  }

  confirmDeleteTorrent (infoHash, deleteData) {
    this.state.modal = {
      id: 'remove-torrent-modal',
      infoHash,
      deleteData
    }
  }

  // TODO: use torrentKey, not infoHash
  deleteTorrent (infoHash, deleteData) {
    ipcRenderer.send('wt-stop-torrenting', infoHash)

    const index = this.state.saved.torrents.findIndex((x) => x.infoHash === infoHash)

    if (index > -1) {
      const summary = this.state.saved.torrents[index]

      // remove torrent and poster file
      deleteFile(TorrentSummary.getTorrentPath(summary))
      deleteFile(TorrentSummary.getPosterPath(summary))

      // optionally delete the torrent data
      if (deleteData) moveItemToTrash(summary)

      // remove torrent from saved list
      this.state.saved.torrents.splice(index, 1)
      dispatch('stateSave')
    }

    // prevent user from going forward to a deleted torrent
    this.state.location.clearForward('player')
    sound.play('DELETE')
  }

  toggleSelectTorrent (infoHash) {
    if (this.state.selectedInfoHash === infoHash) {
      this.state.selectedInfoHash = null
    } else {
      this.state.selectedInfoHash = infoHash
    }
  }

  openTorrentContextMenu (infoHash) {
    const torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    const menu = new electron.remote.Menu()

    menu.append(new electron.remote.MenuItem({
      label: 'Remove From List',
      click: () => dispatch('confirmDeleteTorrent', torrentSummary.infoHash, false)
    }))

    menu.append(new electron.remote.MenuItem({
      label: 'Remove Data File',
      click: () => dispatch('confirmDeleteTorrent', torrentSummary.infoHash, true)
    }))

    menu.append(new electron.remote.MenuItem({
      type: 'separator'
    }))

    if (torrentSummary.files) {
      menu.append(new electron.remote.MenuItem({
        label: process.platform === 'darwin' ? 'Show in Finder' : 'Show in Folder',
        click: () => showItemInFolder(torrentSummary)
      }))
      menu.append(new electron.remote.MenuItem({
        type: 'separator'
      }))
    }

    menu.append(new electron.remote.MenuItem({
      label: 'Copy Magnet Link to Clipboard',
      click: () => electron.clipboard.writeText(torrentSummary.magnetURI)
    }))

    menu.append(new electron.remote.MenuItem({
      label: 'Copy Instant.io Link to Clipboard',
      click: () => electron.clipboard.writeText(`https://instant.io/#${torrentSummary.infoHash}`)
    }))

    menu.append(new electron.remote.MenuItem({
      label: 'Save Torrent File As...',
      click: () => dispatch('saveTorrentFileAs', torrentSummary.torrentKey),
      enabled: typeof torrentSummary.torrentFileName !== 'undefined'
    }))

    menu.popup(electron.remote.getCurrentWindow())
  }

  // Takes a torrentSummary or torrentKey
  // Shows a Save File dialog, then saves the .torrent file wherever the user requests
  saveTorrentFileAs (torrentKey) {
    const torrentSummary = TorrentSummary.getByKey(this.state, torrentKey)
    if (!torrentSummary) throw new Error('Missing torrentKey: ' + torrentKey)
    const downloadPath = this.state.saved.prefs.downloadPath
    const newFileName = path.parse(torrentSummary.name).name + '.torrent'
    const win = electron.remote.getCurrentWindow()
    const opts = {
      title: 'Save Torrent File',
      defaultPath: path.join(downloadPath, newFileName),
      filters: [
        { name: 'Torrent Files', extensions: ['torrent'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }

    electron.remote.dialog.showSaveDialog(win, opts, function (savePath) {
      console.log('Saving torrent ' + torrentKey + ' to ' + savePath)
      if (!savePath) return // They clicked Cancel
      const torrentPath = TorrentSummary.getTorrentPath(torrentSummary)
      fs.readFile(torrentPath, function (err, torrentFile) {
        if (err) return dispatch('error', err)
        fs.writeFile(savePath, torrentFile, function (err) {
          if (err) return dispatch('error', err)
        })
      })
    })
  }
}

// Recursively finds {name, path, size} for all files in a folder
// Calls `cb` on success, calls `onError` on failure
function findFilesRecursive (paths, cb) {
  if (paths.length > 1) {
    let numComplete = 0
    let ret = []
    paths.forEach(function (path) {
      findFilesRecursive([path], function (fileObjs) {
        ret.push(...fileObjs)
        if (++numComplete === paths.length) {
          ret.sort((a, b) => a.path < b.path ? -1 : a.path > b.path)
          cb(ret)
        }
      })
    })
    return
  }

  const fileOrFolder = paths[0]
  fs.stat(fileOrFolder, function (err, stat) {
    if (err) return dispatch('error', err)

    // Files: return name, path, and size
    if (!stat.isDirectory()) {
      const filePath = fileOrFolder
      return cb([{
        name: path.basename(filePath),
        path: filePath,
        size: stat.size
      }])
    }

    // Folders: recurse, make a list of all the files
    const folderPath = fileOrFolder
    fs.readdir(folderPath, function (err, fileNames) {
      if (err) return dispatch('error', err)
      const paths = fileNames.map((fileName) => path.join(folderPath, fileName))
      findFilesRecursive(paths, cb)
    })
  })
}

function deleteFile (path) {
  if (!path) return
  fs.unlink(path, function (err) {
    if (err) dispatch('error', err)
  })
}

// Delete all files in a torrent
function moveItemToTrash (torrentSummary) {
  const filePath = TorrentSummary.getFileOrFolder(torrentSummary)
  if (filePath) ipcRenderer.send('moveItemToTrash', filePath)
}

function showItemInFolder (torrentSummary) {
  ipcRenderer.send('showItemInFolder', TorrentSummary.getFileOrFolder(torrentSummary))
}
