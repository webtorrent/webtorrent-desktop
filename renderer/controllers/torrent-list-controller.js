const fs = require('fs')
const path = require('path')
const electron = require('electron')

const {dispatch} = require('../lib/dispatcher')
const State = require('../lib/state')
const sound = require('../lib/sound')
const TorrentSummary = require('../lib/torrent-summary')

const ipcRenderer = electron.ipcRenderer

const instantIoRegex = /^(https:\/\/)?instant\.io\/#/

// Controls the torrent list: creating, adding, deleting, & manipulating torrents
module.exports = class TorrentListController {
  constructor (state) {
    this.state = state
  }

  // Adds a torrent to the list, starts downloading/seeding. TorrentID can be a
  // magnet URI, infohash, or torrent file: https://github.com/feross/webtorrent#clientaddtorrentid-opts-function-ontorrent-torrent-
  addTorrent (torrentId) {
    if (torrentId.path) {
      // Use path string instead of W3C File object
      torrentId = torrentId.path
    }
    // Allow a instant.io link to be pasted
    // TODO: remove this once support is added to webtorrent core
    if (typeof torrentId === 'string' && instantIoRegex.test(torrentId)) {
      torrentId = torrentId.slice(torrentId.indexOf('#') + 1)
    }

    var torrentKey = this.state.nextTorrentKey++
    var path = this.state.saved.prefs.downloadPath

    ipcRenderer.send('wt-start-torrenting', torrentKey, torrentId, path)

    dispatch('backToList')
  }

  // Shows the Create Torrent page with options to seed a given file or folder
  showCreateTorrent (files) {
    // Files will either be an array of file objects, which we can send directly
    // to the create-torrent screen
    if (files.length === 0 || typeof files[0] !== 'string') {
      this.state.location.go({
        url: 'create-torrent',
        files: files
      })
      return
    }

    // ... or it will be an array of mixed file and folder paths. We have to walk
    // through all the folders and find the files
    findFilesRecursive(files, (allFiles) => this.showCreateTorrent(allFiles))
  }

  // Switches between the advanced and simple Create Torrent UI
  toggleCreateTorrentAdvanced () {
    var info = this.state.location.current()
    if (info.url !== 'create-torrent') return
    info.showAdvanced = !info.showAdvanced
  }

  // Creates a new torrent and start seeeding
  createTorrent (options) {
    var state = this.state
    var torrentKey = state.nextTorrentKey++
    ipcRenderer.send('wt-create-torrent', torrentKey, options)
    state.location.backToFirst(function () {
      state.location.clearForward('create-torrent')
    })
  }

  // Starts downloading and/or seeding a given torrentSummary.
  startTorrentingSummary (torrentSummary) {
    var s = torrentSummary

    // Backward compatibility for config files save before we had torrentKey
    if (!s.torrentKey) s.torrentKey = this.state.nextTorrentKey++

    // Use Downloads folder by default
    if (!s.path) s.path = this.state.saved.prefs.downloadPath

    ipcRenderer.send('wt-start-torrenting',
                      s.torrentKey,
                      TorrentSummary.getTorrentID(s),
                      s.path,
                      s.fileModtimes,
                      s.selections)
  }

  // TODO: use torrentKey, not infoHash
  toggleTorrent (infoHash) {
    var torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    if (torrentSummary.status === 'paused') {
      torrentSummary.status = 'new'
      this.startTorrentingSummary(torrentSummary)
      sound.play('ENABLE')
    } else {
      torrentSummary.status = 'paused'
      ipcRenderer.send('wt-stop-torrenting', torrentSummary.infoHash)
      sound.play('DISABLE')
    }
  }

  toggleTorrentFile (infoHash, index) {
    var torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    torrentSummary.selections[index] = !torrentSummary.selections[index]

    // Let the WebTorrent process know to start or stop fetching that file
    ipcRenderer.send('wt-select-files', infoHash, torrentSummary.selections)
  }

  // TODO: use torrentKey, not infoHash
  deleteTorrent (infoHash, deleteData) {
    var state = this.state

    ipcRenderer.send('wt-stop-torrenting', infoHash)

    if (deleteData) {
      var torrentSummary = TorrentSummary.getByKey(state, infoHash)
      moveItemToTrash(torrentSummary)
    }

    var index = state.saved.torrents.findIndex((x) => x.infoHash === infoHash)
    if (index > -1) state.saved.torrents.splice(index, 1)
    State.saveThrottled(state)
    state.location.clearForward('player') // prevent user from going forward to a deleted torrent
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
    var torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    var menu = new electron.remote.Menu()

    menu.append(new electron.remote.MenuItem({
      label: 'Remove From List',
      click: () => this.deleteTorrent(
        torrentSummary.infoHash, false)
    }))

    menu.append(new electron.remote.MenuItem({
      label: 'Remove Data File',
      click: () => this.deleteTorrent(
        torrentSummary.infoHash, true)
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
      click: () => saveTorrentFileAs(torrentSummary)
    }))

    menu.popup(electron.remote.getCurrentWindow())
  }
}

// Recursively finds {name, path, size} for all files in a folder
// Calls `cb` on success, calls `onError` on failure
function findFilesRecursive (paths, cb) {
  if (paths.length > 1) {
    var numComplete = 0
    var ret = []
    paths.forEach(function (path) {
      findFilesRecursive([path], function (fileObjs) {
        ret = ret.concat(fileObjs)
        if (++numComplete === paths.length) {
          ret.sort((a, b) => a.path < b.path ? -1 : a.path > b.path)
          cb(ret)
        }
      })
    })
    return
  }

  var fileOrFolder = paths[0]
  fs.stat(fileOrFolder, function (err, stat) {
    if (err) return dispatch('error', err)

    // Files: return name, path, and size
    if (!stat.isDirectory()) {
      var filePath = fileOrFolder
      return cb([{
        name: path.basename(filePath),
        path: filePath,
        size: stat.size
      }])
    }

    // Folders: recurse, make a list of all the files
    var folderPath = fileOrFolder
    fs.readdir(folderPath, function (err, fileNames) {
      if (err) return dispatch('error', err)
      var paths = fileNames.map((fileName) => path.join(folderPath, fileName))
      findFilesRecursive(paths, cb)
    })
  })
}

// Delete all files in a torren
function moveItemToTrash (torrentSummary) {
  // TODO: delete directories, not just files
  torrentSummary.files.forEach(function (file) {
    var filePath = path.join(torrentSummary.path, file.path)
    console.log('DEBUG DELETING ' + filePath)
    ipcRenderer.send('moveItemToTrash', filePath)
  })
}

function showItemInFolder (torrentSummary) {
  ipcRenderer.send('showItemInFolder', TorrentSummary.getTorrentPath(torrentSummary))
}

function saveTorrentFileAs (torrentSummary) {
  var downloadPath = this.state.saved.prefs.downloadPath
  var newFileName = `${path.parse(torrentSummary.name).name}.torrent`
  var opts = {
    title: 'Save Torrent File',
    defaultPath: path.join(downloadPath, newFileName),
    filters: [
      { name: 'Torrent Files', extensions: ['torrent'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }
  electron.remote.dialog.showSaveDialog(electron.remote.getCurrentWindow(), opts, function (savePath) {
    var torrentPath = TorrentSummary.getTorrentPath(torrentSummary)
    fs.readFile(torrentPath, function (err, torrentFile) {
      if (err) return dispatch('error', err)
      fs.writeFile(savePath, torrentFile, function (err) {
        if (err) return dispatch('error', err)
      })
    })
  })
}
