const appConfig = require('application-config')('WebTorrent')
const debounce = require('debounce')
const path = require('path')
const {EventEmitter} = require('events')

const config = require('../../config')
const migrations = require('./migrations')

const SAVE_DEBOUNCE_INTERVAL = 1000

const State = module.exports = Object.assign(new EventEmitter(), {
  getDefaultPlayState,
  load,
  // state.save() calls are rate-limited. Use state.saveImmediate() to skip limit.
  save: debounce(saveImmediate, SAVE_DEBOUNCE_INTERVAL),
  saveImmediate
})

appConfig.filePath = path.join(config.CONFIG_PATH, 'config.json')

function getDefaultState () {
  const LocationHistory = require('location-history')

  return {
    /*
     * Temporary state disappears once the program exits.
     * It can contain complex objects like open connections, etc.
     */
    client: null, /* the WebTorrent client */
    server: null, /* local WebTorrent-to-HTTP server */
    prev: { /* used for state diffing in updateElectron() */
      title: null,
      progress: -1,
      badge: null
    },
    location: new LocationHistory(),
    window: {
      bounds: null, /* {x, y, width, height } */
      isFocused: true,
      isFullScreen: false,
      title: config.APP_WINDOW_TITLE
    },
    selectedInfoHash: null, /* the torrent we've selected to view details. see state.torrents */
    playing: getDefaultPlayState(), /* the media (audio or video) that we're currently playing */
    devices: {}, /* playback devices like Chromecast and AppleTV */
    dock: {
      badge: 0,
      progress: 0
    },
    modal: null, /* modal popover */
    errors: [], /* user-facing errors */
    nextTorrentKey: 1, /* identify torrents for IPC between the main and webtorrent windows */

    /*
     * Saved state is read from and written to a file every time the app runs.
     * It should be simple and minimal and must be JSON.
     * It must never contain absolute paths since we have a portable app.
     *
     * Config path:
     *
     * Mac                  ~/Library/Application Support/WebTorrent/config.json
     * Linux (XDG)          $XDG_CONFIG_HOME/WebTorrent/config.json
     * Linux (Legacy)       ~/.config/WebTorrent/config.json
     * Windows (> Vista)    %LOCALAPPDATA%/WebTorrent/config.json
     * Windows (XP, 2000)   %USERPROFILE%/Local Settings/Application Data/WebTorrent/config.json
     *
     * Also accessible via `require('application-config')('WebTorrent').filePath`
     */
    saved: {},

    /*
     * Getters, for convenience
     */
    getPlayingTorrentSummary,
    getPlayingFileSummary,
    getExternalPlayerName
  }
}

/* Whenever we stop playing video or audio, here's what we reset state.playing to */
function getDefaultPlayState () {
  return {
    infoHash: null, /* the info hash of the torrent we're playing */
    fileIndex: null, /* the zero-based index within the torrent */
    location: 'local', /* 'local', 'chromecast', 'airplay' */
    type: null, /* 'audio' or 'video', could be 'other' if ever support eg streaming to VLC */
    currentTime: 0, /* seconds */
    duration: 1, /* seconds */
    isPaused: true,
    isStalled: false,
    lastTimeUpdate: 0, /* Unix time in ms */
    mouseStationarySince: 0, /* Unix time in ms */
    playbackRate: 1,
    volume: 1,
    subtitles: {
      tracks: [], /* subtitle tracks, each {label, language, ...} */
      selectedIndex: -1, /* current subtitle track */
      showMenu: false /* popover menu, above the video */
    },
    aspectRatio: 0 /* aspect ratio of the video */
  }
}

/* If the saved state file doesn't exist yet, here's what we use instead */
function setupStateSaved (cb) {
  const fs = require('fs-extra')
  const parseTorrent = require('parse-torrent')
  const parallel = require('run-parallel')

  const saved = {
    prefs: {
      downloadPath: config.DEFAULT_DOWNLOAD_PATH,
      isFileHandler: false,
      openExternalPlayer: false,
      externalPlayerPath: null,
      startup: false
    },
    torrents: config.DEFAULT_TORRENTS.map(createTorrentObject),
    version: config.APP_VERSION /* make sure we can upgrade gracefully later */
  }

  const tasks = []

  config.DEFAULT_TORRENTS.map(function (t, i) {
    const infoHash = saved.torrents[i].infoHash
    tasks.push(function (cb) {
      fs.copy(
        path.join(config.STATIC_PATH, t.posterFileName),
        path.join(config.POSTER_PATH, infoHash + path.extname(t.posterFileName)),
        cb
      )
    })
    tasks.push(function (cb) {
      fs.copy(
        path.join(config.STATIC_PATH, t.torrentFileName),
        path.join(config.TORRENT_PATH, infoHash + '.torrent'),
        cb
      )
    })
  })

  parallel(tasks, function (err) {
    if (err) return cb(err)
    cb(null, saved)
  })

  function createTorrentObject (t) {
    const torrent = fs.readFileSync(path.join(config.STATIC_PATH, t.torrentFileName))
    const parsedTorrent = parseTorrent(torrent)

    return {
      status: 'paused',
      infoHash: parsedTorrent.infoHash,
      name: t.name,
      displayName: t.name,
      posterFileName: parsedTorrent.infoHash + path.extname(t.posterFileName),
      torrentFileName: parsedTorrent.infoHash + '.torrent',
      magnetURI: parseTorrent.toMagnetURI(parsedTorrent),
      files: parsedTorrent.files,
      selections: parsedTorrent.files.map((x) => true),
      testID: t.testID
    }
  }
}

function getPlayingTorrentSummary () {
  const infoHash = this.playing.infoHash
  return this.saved.torrents.find((x) => x.infoHash === infoHash)
}

function getPlayingFileSummary () {
  const torrentSummary = this.getPlayingTorrentSummary()
  if (!torrentSummary) return null
  return torrentSummary.files[this.playing.fileIndex]
}

function getExternalPlayerName () {
  const playerPath = this.saved.prefs.externalPlayerPath
  if (!playerPath) return 'VLC'
  return path.basename(playerPath).split('.')[0]
}

function load (cb) {
  const state = getDefaultState()

  appConfig.read(function (err, saved) {
    if (err || !saved.version) {
      console.log('Missing config file: Creating new one')
      setupStateSaved(onSaved)
    } else {
      onSaved(null, saved)
    }
  })

  function onSaved (err, saved) {
    if (err) return cb(err)
    state.saved = saved
    migrations.run(state)
    cb(null, state)
  }
}

// Write state.saved to the JSON state file
function saveImmediate (state, cb) {
  console.log('Saving state to ' + appConfig.filePath)

  // Clean up, so that we're not saving any pending state
  const copy = Object.assign({}, state.saved)
  // Remove torrents pending addition to the list, where we haven't finished
  // reading the torrent file or file(s) to seed & don't have an infohash
  copy.torrents = copy.torrents
    .filter((x) => x.infoHash)
    .map(function (x) {
      const torrent = {}
      for (let key in x) {
        if (key === 'progress' || key === 'torrentKey') {
          continue // Don't save progress info or key for the webtorrent process
        }
        if (key === 'playStatus') {
          continue // Don't save whether a torrent is playing / pending
        }
        if (key === 'error') {
          continue // Don't save error states
        }
        torrent[key] = x[key]
      }
      return torrent
    })

  appConfig.write(copy, (err) => {
    if (err) console.error(err)
    else State.emit('stateSaved')
  })
}
