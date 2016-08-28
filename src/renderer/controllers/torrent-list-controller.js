const fs = require('fs')
const path = require('path')
const electron = require('electron')
const IntlMessageFormat = require('intl-messageformat')

const {dispatch} = require('../lib/dispatcher')
const i18n = require('../../i18n')
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
          this.state.window.title = new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['create-torrent'] || 'Create New Torrent', i18n.LANGUAGE).format()
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
    var state = this.state
    var torrentKey = state.nextTorrentKey++
    ipcRenderer.send('wt-create-torrent', torrentKey, options)
    state.location.cancel()
  }

  // Starts downloading and/or seeding a given torrentSummary.
  startTorrentingSummary (torrentKey) {
    var s = TorrentSummary.getByKey(this.state, torrentKey)
    if (!s) throw new Error('Missing key: ' + torrentKey)

    // New torrent: give it a path
    if (!s.path) {
      // Use Downloads folder by default
      s.path = this.state.saved.prefs.downloadPath
      return start()
    }

    // Existing torrent: check that the path is still there
    fs.stat(TorrentSummary.getFileOrFolder(s), function (err) {
      if (err) {
        s.error = 'path-missing'
        return
      }
      start()
    })

    function start () {
      ipcRenderer.send('wt-start-torrenting',
        s.torrentKey,
        TorrentSummary.getTorrentID(s),
        s.path,
        s.fileModtimes,
        s.selections)
    }
  }

  // TODO: use torrentKey, not infoHash
  toggleTorrent (infoHash) {
    var torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
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
    var torrentSummary = TorrentSummary.getByKey(this.state, infoHash)
    torrentSummary.selections[index] = !torrentSummary.selections[index]

    // Let the WebTorrent process know to start or stop fetching that file
    ipcRenderer.send('wt-select-files', infoHash, torrentSummary.selections)
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

    var index = this.state.saved.torrents.findIndex((x) => x.infoHash === infoHash)

    if (index > -1) {
      var summary = this.state.saved.torrents[index]

      // remove torrent and poster file
      deleteFile(TorrentSummary.getTorrentPath(summary))
      deleteFile(TorrentSummary.getPosterPath(summary)) // TODO: will the css path hack affect windows?

      // optionally delete the torrent data
      if (deleteData) moveItemToTrash(summary)

      // remove torrent from saved list
      this.state.saved.torrents.splice(index, 1)
      State.saveThrottled(this.state)
    }

    this.state.location.clearForward('player') // prevent user from going forward to a deleted torrent
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

    var msg = new IntlMessageFormat(
      i18n.LOCALE_MESSAGES['torrent-delete-torrent'] || 'Remove From List', i18n.LANGUAGE)

    menu.append(new electron.remote.MenuItem({
      label: msg.format(),
      click: () => dispatch('confirmDeleteTorrent', torrentSummary.infoHash, false)
    }))

    msg = new IntlMessageFormat(
      i18n.LOCALE_MESSAGES['torrent-delete-data'] || 'Remove Data File', i18n.LANGUAGE)
    menu.append(new electron.remote.MenuItem({
      label: msg.format(),
      click: () => dispatch('confirmDeleteTorrent', torrentSummary.infoHash, true)
    }))

    menu.append(new electron.remote.MenuItem({
      type: 'separator'
    }))

    if (torrentSummary.files) {
      var finderMsg = new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['torrent-finder-show'] || 'Show in Finder', i18n.LANGUAGE)
      var folderMsg = new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['torrent-folder-show'] || 'Show in Folder', i18n.LANGUAGE)
      menu.append(new electron.remote.MenuItem({
        label: process.platform === 'darwin' ? finderMsg.format() : folderMsg.format(),
        click: () => showItemInFolder(torrentSummary)
      }))
      menu.append(new electron.remote.MenuItem({
        type: 'separator'
      }))
    }

    msg = new IntlMessageFormat(i18n.LOCALE_MESSAGES['torrent-copy-magnet'] || 'Copy Magnet Link to Clipboard', i18n.LANGUAGE)
    menu.append(new electron.remote.MenuItem({
      label: msg.format(),
      click: () => electron.clipboard.writeText(torrentSummary.magnetURI)
    }))

    msg = new IntlMessageFormat(i18n.LOCALE_MESSAGES['torrent-copy-instant'] || 'Copy Instant.io Link to Clipboard', i18n.LANGUAGE)
    menu.append(new electron.remote.MenuItem({
      label: msg.format(),
      click: () => electron.clipboard.writeText(`https://instant.io/#${torrentSummary.infoHash}`)
    }))

    msg = new IntlMessageFormat(i18n.LOCALE_MESSAGES['torrent-save-torrent'] || 'Save Torrent File As...', i18n.LANGUAGE)
    menu.append(new electron.remote.MenuItem({
      label: msg.format(),
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

function deleteFile (path) {
  if (!path) return
  fs.unlink(path, function (err) {
    if (err) dispatch('error', err)
  })
}

// Delete all files in a torrent
function moveItemToTrash (torrentSummary) {
  var filePath = TorrentSummary.getFileOrFolder(torrentSummary)
  if (filePath) ipcRenderer.send('moveItemToTrash', filePath)
}

function showItemInFolder (torrentSummary) {
  ipcRenderer.send('showItemInFolder', TorrentSummary.getFileOrFolder(torrentSummary))
}

function saveTorrentFileAs (torrentSummary) {
  var downloadPath = this.state.saved.prefs.downloadPath
  var newFileName = path.parse(torrentSummary.name).name + '.torrent'
  var opts = {
    title: 'Save Torrent File',
    defaultPath: path.join(downloadPath, newFileName),
    filters: [
      { name: 'Torrent Files', extensions: ['torrent'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }
  electron.remote.dialog.showSaveDialog(electron.remote.getCurrentWindow(), opts, function (savePath) {
    if (!savePath) return // They clicked Cancel
    var torrentPath = TorrentSummary.getTorrentPath(torrentSummary)
    fs.readFile(torrentPath, function (err, torrentFile) {
      if (err) return dispatch('error', err)
      fs.writeFile(savePath, torrentFile, function (err) {
        if (err) return dispatch('error', err)
      })
    })
  })
}
