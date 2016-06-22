console.time('init')

var crashReporter = require('../crash-reporter')
crashReporter.init()

var dragDrop = require('drag-drop')
var electron = require('electron')
var fs = require('fs-extra')
var mainLoop = require('main-loop')
var parallel = require('run-parallel')
var path = require('path')

var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')

var config = require('../config')
var App = require('./views/app')
var telemetry = require('./lib/telemetry')
var errors = require('./lib/errors')
var sound = require('./lib/sound')
var State = require('./lib/state')
var TorrentPlayer = require('./lib/torrent-player')
var TorrentSummary = require('./lib/torrent-summary')
var {setDispatch} = require('./lib/dispatcher')

// Electron apps have two processes: a main process (node) runs first and starts
// a renderer process (essentially a Chrome window). We're in the renderer process,
// and this IPC channel receives from and sends messages to the main process
var ipcRenderer = electron.ipcRenderer

var state, vdomLoop

// This dependency is the slowest-loading, so we lazy load it
var Cast = null

init()

function init () {
  // All state lives in state.js. `state.saved` is read from and written to a file.
  // All other state is ephemeral. First we load state.saved then initialize the app.
  State.load(onState)

  setDispatch(dispatch)
}

/**
 * Called once when the application loads. (Not once per window.)
 * Connects to the torrent networks, sets up the UI and OS integrations like
 * the dock icon and drag+drop.
 */
function onState (err, _state) {
  if (err) return onError(err)
  state = _state

  // Add first page to location history
  state.location.go({
    url: 'home',
    onbeforeload: (cb) => {
      state.window.title = config.APP_WINDOW_TITLE
      cb()
    }
  })

  // Restart everything we were torrenting last time the app ran
  resumeTorrents()

  // Lazy-load other stuff, like the AppleTV module, later to keep startup fast
  window.setTimeout(delayedInit, config.DELAYED_INIT)

  // The UI is built with virtual-dom, a minimalist library extracted from React
  // The concepts--one way data flow, a pure function that renders state to a
  // virtual DOM tree, and a diff that applies changes in the vdom to the real
  // DOM, are all the same. Learn more: https://facebook.github.io/react/
  vdomLoop = mainLoop(state, render, {
    create: createElement,
    diff: diff,
    patch: patch
  })
  document.body.appendChild(vdomLoop.target)

  // Listen for messages from the main process
  setupIpc()

  // Calling update() updates the UI given the current state
  // Do this at least once a second to give every file in every torrentSummary
  // a progress bar and to keep the cursor in sync when playing a video
  setInterval(update, 1000)

  // OS integrations:
  // ...drag and drop a torrent or video file to play or seed
  dragDrop('body', onOpen)

  // ...same thing if you paste a torrent
  document.addEventListener('paste', onPaste)

  // ...focus and blur. Needed to show correct dock icon text ("badge") in OSX
  window.addEventListener('focus', onFocus)
  window.addEventListener('blur', onBlur)

  // ...window visibility state.
  document.addEventListener('webkitvisibilitychange', onVisibilityChange)

  // Log uncaught JS errors
  window.addEventListener('error',
    (e) => telemetry.logUncaughtError('window', e.error), true)

  // Done! Ideally we want to get here < 500ms after the user clicks the app
  sound.play('STARTUP')
  console.timeEnd('init')
}

function delayedInit () {
  lazyLoadCast()
  sound.preload()
  telemetry.init(state)
}

// Lazily loads Chromecast and Airplay support
function lazyLoadCast () {
  if (!Cast) {
    Cast = require('./lib/cast')
    Cast.init(state, update) // Search the local network for Chromecast and Airplays
  }
  return Cast
}

// This is the (mostly) pure function from state -> UI. Returns a virtual DOM
// tree. Any events, such as button clicks, will turn into calls to dispatch()
function render (state) {
  try {
    return App(state)
  } catch (e) {
    console.log('rendering error: %s\n\t%s', e.message, e.stack)
  }
}

// Calls render() to go from state -> UI, then applies to vdom to the real DOM.
function update () {
  showOrHidePlayerControls()
  vdomLoop.update(state)
  updateElectron()
}

function updateElectron () {
  if (state.window.title !== state.prev.title) {
    state.prev.title = state.window.title
    ipcRenderer.send('setTitle', state.window.title)
  }
  if (state.dock.progress !== state.prev.progress) {
    state.prev.progress = state.dock.progress
    ipcRenderer.send('setProgress', state.dock.progress)
  }
  if (state.dock.badge !== state.prev.badge) {
    state.prev.badge = state.dock.badge
    ipcRenderer.send('setBadge', state.dock.badge || '')
  }
}

// Events from the UI never modify state directly. Instead they call dispatch()
function dispatch (action, ...args) {
  // Log dispatch calls, for debugging
  if (!['mediaMouseMoved', 'mediaTimeUpdate'].includes(action)) {
    console.log('dispatch: %s %o', action, args)
  }

  if (action === 'onOpen') {
    onOpen(args[0] /* files */)
  }
  if (action === 'addTorrent') {
    addTorrent(args[0] /* torrent */)
  }
  if (action === 'openTorrentFile') {
    ipcRenderer.send('openTorrentFile') /* open torrent file */
  }
  if (action === 'openFiles') {
    ipcRenderer.send('openFiles') /* add files with dialog */
  }
  if (action === 'showCreateTorrent') {
    showCreateTorrent(args[0] /* paths */)
  }
  if (action === 'openTorrentAddress') {
    state.modal = { id: 'open-torrent-address-modal' }
  }
  if (action === 'createTorrent') {
    createTorrent(args[0] /* options */)
  }
  if (action === 'openItem') {
    openItem(args[0] /* infoHash */, args[1] /* index */)
  }
  if (action === 'toggleTorrent') {
    toggleTorrent(args[0] /* infoHash */)
  }
  if (action === 'deleteTorrent') {
    deleteTorrent(args[0] /* infoHash */)
  }
  if (action === 'toggleSelectTorrent') {
    toggleSelectTorrent(args[0] /* infoHash */)
  }
  if (action === 'toggleTorrentFile') {
    toggleTorrentFile(args[0] /* infoHash */, args[1] /* index */)
  }
  if (action === 'openTorrentContextMenu') {
    openTorrentContextMenu(args[0] /* infoHash */)
  }
  if (action === 'toggleCastMenu') {
    lazyLoadCast().toggleMenu(args[0] /* deviceType */)
  }
  if (action === 'selectCastDevice') {
    lazyLoadCast().selectDevice(args[0] /* index */)
  }
  if (action === 'stopCasting') {
    lazyLoadCast().stop()
  }
  if (action === 'setDimensions') {
    setDimensions(args[0] /* dimensions */)
  }
  if (action === 'backToList') {
    backToList()
  }
  if (action === 'escapeBack') {
    if (state.modal) {
      dispatch('exitModal')
    } else if (state.window.isFullScreen) {
      dispatch('toggleFullScreen')
    } else {
      dispatch('back')
    }
  }
  if (action === 'back') {
    state.location.back()
  }
  if (action === 'forward') {
    state.location.forward()
  }
  if (action === 'playPause') {
    playPause()
  }
  if (action === 'play') {
    playFile(args[0] /* infoHash */, args[1] /* index */)
  }
  if (action === 'playbackJump') {
    jumpToTime(args[0] /* seconds */)
  }
  if (action === 'skip') {
    jumpToTime(state.playing.currentTime + (args[0] /* direction */ * 10))
  }
  if (action === 'changePlaybackRate') {
    changePlaybackRate(args[0] /* direction */)
  }
  if (action === 'changeVolume') {
    changeVolume(args[0] /* increase */)
  }
  if (action === 'setVolume') {
    setVolume(args[0] /* increase */)
  }
  if (action === 'openSubtitles') {
    openSubtitles()
  }
  if (action === 'selectSubtitle') {
    selectSubtitle(args[0] /* index */)
  }
  if (action === 'toggleSubtitlesMenu') {
    toggleSubtitlesMenu()
  }
  if (action === 'mediaStalled') {
    state.playing.isStalled = true
  }
  if (action === 'mediaError') {
    if (state.location.url() === 'player') {
      state.playing.result = 'error'
      state.playing.location = 'error'
      ipcRenderer.send('checkForVLC')
      ipcRenderer.once('checkForVLC', function (e, isInstalled) {
        state.modal = {
          id: 'unsupported-media-modal',
          error: args[0],
          vlcInstalled: isInstalled
        }
      })
    }
  }
  if (action === 'mediaSuccess') {
    state.playing.result = 'success'
  }
  if (action === 'mediaTimeUpdate') {
    state.playing.lastTimeUpdate = new Date().getTime()
    state.playing.isStalled = false
  }
  if (action === 'mediaMouseMoved') {
    state.playing.mouseStationarySince = new Date().getTime()
  }
  if (action === 'vlcPlay') {
    ipcRenderer.send('vlcPlay', state.server.localURL)
    state.playing.location = 'vlc'
  }
  if (action === 'vlcNotFound') {
    if (state.modal && state.modal.id === 'unsupported-media-modal') {
      state.modal.vlcNotFound = true
    }
  }
  if (action === 'toggleFullScreen') {
    ipcRenderer.send('toggleFullScreen', args[0] /* optional bool */)
  }
  if (action === 'exitModal') {
    state.modal = null
  }
  if (action === 'preferences') {
    state.location.go({
      url: 'preferences',
      onbeforeload: function (cb) {
        // initialize preferences
        state.window.title = 'Preferences'
        state.unsaved = Object.assign(state.unsaved || {}, {prefs: state.saved.prefs || {}})
        cb()
      },
      onafterunload: savePreferences
    })
  }
  if (action === 'updatePreferences') {
    updatePreferences(args[0], args[1] /* property, value */)
  }
  if (action === 'updateAvailable') {
    updateAvailable(args[0] /* version */)
  }
  if (action === 'skipVersion') {
    if (!state.saved.skippedVersions) state.saved.skippedVersions = []
    state.saved.skippedVersions.push(args[0] /* version */)
    saveStateThrottled()
  }
  if (action === 'saveState') {
    State.save(state)
  }
  if (action === 'setTitle') {
    state.window.title = args[0] /* title */
  }
  if (action === 'uncaughtError') {
    telemetry.logUncaughtError(args[0] /* process */, args[1] /* error */)
  }

  // Update the virtual-dom, unless it's just a mouse move event
  if (action !== 'mediaMouseMoved' || showOrHidePlayerControls()) {
    update()
  }
}

// Shows a modal saying that we have an update
function updateAvailable (version) {
  if (state.saved.skippedVersions && state.saved.skippedVersions.includes(version)) {
    console.log('new version skipped by user: v' + version)
    return
  }
  state.modal = { id: 'update-available-modal', version: version }
}

function play () {
  if (!state.playing.isPaused) return
  state.playing.isPaused = false
  if (isCasting()) {
    Cast.play()
  }
  ipcRenderer.send('onPlayerPlay')
}

function pause () {
  if (state.playing.isPaused) return
  state.playing.isPaused = true
  if (isCasting()) {
    Cast.pause()
  }
  ipcRenderer.send('onPlayerPause')
}

function playPause () {
  if (state.location.url() !== 'player') return

  if (state.playing.isPaused) {
    play()
  } else {
    pause()
  }

  // force rerendering if window is hidden,
  // in order to bypass `raf` and play/pause media immediately
  if (!state.window.isVisible) render(state)
}

function jumpToTime (time) {
  if (isCasting()) {
    Cast.seek(time)
  } else {
    state.playing.jumpToTime = time
  }
}
function changePlaybackRate (direction) {
  var rate = state.playing.playbackRate
  if (direction > 0 && rate >= 0.25 && rate < 2) {
    rate += 0.25
  } else if (direction < 0 && rate > 0.25 && rate <= 2) {
    rate -= 0.25
  } else if (direction < 0 && rate === 0.25) { /* when we set playback rate at 0 in html 5, playback hangs ;( */
    rate = -1
  } else if (direction > 0 && rate === -1) {
    rate = 0.25
  } else if ((direction > 0 && rate >= 1 && rate < 16) || (direction < 0 && rate > -16 && rate <= -1)) {
    rate *= 2
  } else if ((direction < 0 && rate > 1 && rate <= 16) || (direction > 0 && rate >= -16 && rate < -1)) {
    rate /= 2
  }
  state.playing.playbackRate = rate
  if (lazyLoadCast().isCasting() && !Cast.setRate(rate)) {
    state.playing.playbackRate = 1
  }
}
function changeVolume (delta) {
  // change volume with delta value
  setVolume(state.playing.volume + delta)
}

function setVolume (volume) {
  // check if its in [0.0 - 1.0] range
  volume = Math.max(0, Math.min(1, volume))
  if (isCasting()) {
    Cast.setVolume(volume)
  } else {
    state.playing.setVolume = volume
  }
}

function openSubtitles () {
  electron.remote.dialog.showOpenDialog({
    title: 'Select a subtitles file.',
    filters: [ { name: 'Subtitles', extensions: ['vtt', 'srt'] } ],
    properties: [ 'openFile' ]
  }, function (filenames) {
    if (!Array.isArray(filenames)) return
    addSubtitles(filenames, true)
  })
}

// Quits any modal popovers and returns to the torrent list screen
function backToList () {
  // Exit any modals and screens with a back button
  state.modal = null
  state.location.backToFirst(function () {
    // If we were already on the torrent list, scroll to the top
    var contentTag = document.querySelector('.content')
    if (contentTag) contentTag.scrollTop = 0

    // Work around virtual-dom issue: it doesn't expose its redraw function,
    // and only redraws on requestAnimationFrame(). That means when the user
    // closes the window (hide window / minimize to tray) and we want to pause
    // the video, we update the vdom but it keeps playing until you reopen!
    var mediaTag = document.querySelector('video,audio')
    if (mediaTag) mediaTag.pause()
  })
}

// Checks whether we are connected and already casting
// Returns false if we not casting (state.playing.location === 'local')
// or if we're trying to connect but haven't yet ('chromecast-pending', etc)
function isCasting () {
  return state.playing.location === 'chromecast' ||
    state.playing.location === 'airplay' ||
    state.playing.location === 'dlna'
}

function setupIpc () {
  ipcRenderer.on('log', (e, ...args) => console.log(...args))
  ipcRenderer.on('error', (e, ...args) => console.error(...args))

  ipcRenderer.on('dispatch', (e, ...args) => dispatch(...args))

  ipcRenderer.on('fullscreenChanged', function (e, isFullScreen) {
    state.window.isFullScreen = isFullScreen
    if (!isFullScreen) {
      // Aspect ratio gets reset in fullscreen mode, so restore it (OS X)
      ipcRenderer.send('setAspectRatio', state.playing.aspectRatio)
    }
    update()
  })

  ipcRenderer.on('wt-infohash', (e, ...args) => torrentInfoHash(...args))
  ipcRenderer.on('wt-metadata', (e, ...args) => torrentMetadata(...args))
  ipcRenderer.on('wt-done', (e, ...args) => torrentDone(...args))
  ipcRenderer.on('wt-warning', (e, ...args) => torrentWarning(...args))
  ipcRenderer.on('wt-error', (e, ...args) => torrentError(...args))

  ipcRenderer.on('wt-progress', (e, ...args) => torrentProgress(...args))
  ipcRenderer.on('wt-file-modtimes', (e, ...args) => torrentFileModtimes(...args))
  ipcRenderer.on('wt-file-saved', (e, ...args) => torrentFileSaved(...args))
  ipcRenderer.on('wt-poster', (e, ...args) => torrentPosterSaved(...args))
  ipcRenderer.on('wt-audio-metadata', (e, ...args) => torrentAudioMetadata(...args))
  ipcRenderer.on('wt-server-running', (e, ...args) => torrentServerRunning(...args))

  ipcRenderer.on('wt-uncaught-error', (e, err) => telemetry.logUncaughtError('webtorrent', err))

  ipcRenderer.send('ipcReady')
}

// Starts all torrents that aren't paused on program startup
function resumeTorrents () {
  state.saved.torrents
    .filter((torrentSummary) => torrentSummary.status !== 'paused')
    .forEach((torrentSummary) => startTorrentingSummary(torrentSummary))
}

// Updates a single property in the UNSAVED prefs
// For example: updatePreferences("foo.bar", "baz")
// Call savePreferences to save to config.json
function updatePreferences (property, value) {
  var path = property.split('.')
  var key = state.unsaved.prefs
  for (var i = 0; i < path.length - 1; i++) {
    if (typeof key[path[i]] === 'undefined') {
      key[path[i]] = {}
    }
    key = key[path[i]]
  }
  key[path[i]] = value
}

// All unsaved prefs take effect atomically, and are saved to config.json
function savePreferences () {
  state.saved.prefs = Object.assign(state.saved.prefs || {}, state.unsaved.prefs)
  State.save(state)
  update()
}

// Don't write state.saved to file more than once a second
function saveStateThrottled () {
  if (state.saveStateTimeout) return
  state.saveStateTimeout = setTimeout(function () {
    delete state.saveStateTimeout
    State.save(state)
    update()
  }, 1000)
}

// Called when the user adds files (.torrent, files to seed, subtitles) to the app
// via any method (drag-drop, drag to app icon, command line)
function onOpen (files) {
  if (!Array.isArray(files)) files = [ files ]

  if (state.modal) {
    state.modal = null
  }

  var subtitles = files.filter(isSubtitle)

  if (state.location.url() === 'home' || subtitles.length === 0) {
    if (files.every(isTorrent)) {
      if (state.location.url() !== 'home') {
        backToList()
      }
      // All .torrent files? Add them.
      files.forEach(addTorrent)
    } else {
      // Show the Create Torrent screen. Let's seed those files.
      showCreateTorrent(files)
    }
  } else if (state.location.url() === 'player') {
    addSubtitles(subtitles, true)
  }

  update()
}

function isTorrent (file) {
  var name = typeof file === 'string' ? file : file.name
  var isTorrentFile = path.extname(name).toLowerCase() === '.torrent'
  var isMagnet = typeof file === 'string' && /^(stream-)?magnet:/.test(file)
  return isTorrentFile || isMagnet
}

function isSubtitle (file) {
  var name = typeof file === 'string' ? file : file.name
  var ext = path.extname(name).toLowerCase()
  return ext === '.srt' || ext === '.vtt'
}

// Gets a torrent summary {name, infoHash, status} from state.saved.torrents
// Returns undefined if we don't know that infoHash
function getTorrentSummary (torrentKey) {
  if (!torrentKey) return undefined
  return state.saved.torrents.find((x) =>
    x.torrentKey === torrentKey || x.infoHash === torrentKey)
}

// Adds a torrent to the list, starts downloading/seeding. TorrentID can be a
// magnet URI, infohash, or torrent file: https://github.com/feross/webtorrent#clientaddtorrentid-opts-function-ontorrent-torrent-
var instantIoRegex = /^(https:\/\/)?instant\.io\/#/
function addTorrent (torrentId) {
  backToList()
  var torrentKey = state.nextTorrentKey++
  var path = state.saved.prefs.downloadPath
  if (torrentId.path) {
    // Use path string instead of W3C File object
    torrentId = torrentId.path
  }
  // Allow a instant.io link to be pasted
  // TODO: remove this once support is added to webtorrent core
  if (typeof torrentId === 'string' && instantIoRegex.test(torrentId)) {
    torrentId = torrentId.slice(torrentId.indexOf('#') + 1)
  }
  ipcRenderer.send('wt-start-torrenting', torrentKey, torrentId, path)
}

function addSubtitles (files, autoSelect) {
  // Subtitles are only supported when playing video files
  if (state.playing.type !== 'video') return
  if (files.length === 0) return

  // Read the files concurrently, then add all resulting subtitle tracks
  var tasks = files.map((file) => (cb) => loadSubtitle(file, cb))
  parallel(tasks, function (err, tracks) {
    if (err) return onError(err)

    for (var i = 0; i < tracks.length; i++) {
      // No dupes allowed
      var track = tracks[i]
      if (state.playing.subtitles.tracks.some(
        (t) => track.filePath === t.filePath)) continue

      // Add the track
      state.playing.subtitles.tracks.push(track)

      // If we're auto-selecting a track, try to find one in the user's language
      if (autoSelect && (i === 0 || isSystemLanguage(track.language))) {
        state.playing.subtitles.selectedIndex =
          state.playing.subtitles.tracks.length - 1
      }
    }

    // Finally, make sure no two tracks have the same label
    relabelSubtitles()
  })
}

function loadSubtitle (file, cb) {
  var concat = require('simple-concat')
  var LanguageDetect = require('languagedetect')
  var srtToVtt = require('srt-to-vtt')

  // Read the .SRT or .VTT file, parse it, add subtitle track
  var filePath = file.path || file

  var vttStream = fs.createReadStream(filePath).pipe(srtToVtt())

  concat(vttStream, function (err, buf) {
    if (err) return onError(new Error('Error parsing subtitles file.'))

    // Detect what language the subtitles are in
    var vttContents = buf.toString().replace(/(.*-->.*)/g, '')
    var langDetected = (new LanguageDetect()).detect(vttContents, 2)
    langDetected = langDetected.length ? langDetected[0][0] : 'subtitle'
    langDetected = langDetected.slice(0, 1).toUpperCase() + langDetected.slice(1)

    var track = {
      buffer: 'data:text/vtt;base64,' + buf.toString('base64'),
      language: langDetected,
      label: langDetected,
      filePath: filePath
    }

    cb(null, track)
  })
}

function selectSubtitle (ix) {
  state.playing.subtitles.selectedIndex = ix
}

// Checks whether a language name like "English" or "German" matches the system
// language, aka the current locale
function isSystemLanguage (language) {
  var iso639 = require('iso-639-1')
  var osLangISO = window.navigator.language.split('-')[0] // eg "en"
  var langIso = iso639.getCode(language) // eg "de" if language is "German"
  return langIso === osLangISO
}

// Make sure we don't have two subtitle tracks with the same label
// Labels each track by language, eg "German", "English", "English 2", ...
function relabelSubtitles () {
  var counts = {}
  state.playing.subtitles.tracks.forEach(function (track) {
    var lang = track.language
    counts[lang] = (counts[lang] || 0) + 1
    track.label = counts[lang] > 1 ? (lang + ' ' + counts[lang]) : lang
  })
}

function checkForSubtitles () {
  if (state.playing.type !== 'video') return
  var torrentSummary = state.getPlayingTorrentSummary()
  if (!torrentSummary || !torrentSummary.progress) return

  torrentSummary.progress.files.forEach(function (fp, ix) {
    if (fp.numPieces !== fp.numPiecesPresent) return // ignore incomplete files
    var file = torrentSummary.files[ix]
    if (!isSubtitle(file.name)) return
    var filePath = path.join(torrentSummary.path, file.path)
    addSubtitles([filePath], false)
  })
}

function toggleSubtitlesMenu () {
  state.playing.subtitles.showMenu = !state.playing.subtitles.showMenu
}

// Starts downloading and/or seeding a given torrentSummary. Returns WebTorrent object
function startTorrentingSummary (torrentSummary) {
  var s = torrentSummary

  // Backward compatibility for config files save before we had torrentKey
  if (!s.torrentKey) s.torrentKey = state.nextTorrentKey++

  // Use Downloads folder by default
  var path = s.path || state.saved.prefs.downloadPath

  var torrentID
  if (s.torrentFileName) { // Load torrent file from disk
    torrentID = TorrentSummary.getTorrentPath(torrentSummary)
  } else { // Load torrent from DHT
    torrentID = s.magnetURI || s.infoHash
  }

  console.log('start torrenting %s %s', s.torrentKey, torrentID)
  ipcRenderer.send('wt-start-torrenting', s.torrentKey, torrentID, path, s.fileModtimes, s.selections)
}

//
// TORRENT MANAGEMENT
// Send commands to the WebTorrent process, handle events
//

// Shows the Create Torrent page with options to seed a given file or folder
function showCreateTorrent (files) {
  // Files will either be an array of file objects, which we can send directly
  // to the create-torrent screen
  if (files.length === 0 || typeof files[0] !== 'string') {
    state.location.go({
      url: 'create-torrent',
      files: files
    })
    return
  }

  // ... or it will be an array of mixed file and folder paths. We have to walk
  // through all the folders and find the files
  findFilesRecursive(files, showCreateTorrent)
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
    if (err) return onError(err)

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
      if (err) return onError(err)
      var paths = fileNames.map((fileName) => path.join(folderPath, fileName))
      findFilesRecursive(paths, cb)
    })
  })
}

// Creates a new torrent and start seeeding
function createTorrent (options) {
  var torrentKey = state.nextTorrentKey++
  ipcRenderer.send('wt-create-torrent', torrentKey, options)
  state.location.backToFirst(function () {
    state.location.clearForward('create-torrent')
  })
}

function torrentInfoHash (torrentKey, infoHash) {
  var torrentSummary = getTorrentSummary(torrentKey)
  console.log('got infohash for %s torrent %s',
    torrentSummary ? 'existing' : 'new', torrentKey)

  if (!torrentSummary) {
    // Check if an existing (non-active) torrent has the same info hash
    if (state.saved.torrents.find((t) => t.infoHash === infoHash)) {
      ipcRenderer.send('wt-stop-torrenting', infoHash)
      return onError(new Error('Cannot add duplicate torrent'))
    }

    torrentSummary = {
      torrentKey: torrentKey,
      status: 'new'
    }
    state.saved.torrents.unshift(torrentSummary)
    sound.play('ADD')
  }

  torrentSummary.infoHash = infoHash
  update()
}

function torrentWarning (torrentKey, message) {
  onWarning(message)
}

function torrentError (torrentKey, message) {
  // TODO: WebTorrent needs semantic errors
  if (message.startsWith('Cannot add duplicate torrent')) {
    // Remove infohash from the message
    message = 'Cannot add duplicate torrent'
  }
  onError(message)

  var torrentSummary = getTorrentSummary(torrentKey)
  if (torrentSummary) {
    console.log('Pausing torrent %s due to error: %s', torrentSummary.infoHash, message)
    torrentSummary.status = 'paused'
    update()
  }
}

function torrentMetadata (torrentKey, torrentInfo) {
  // Summarize torrent
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.status = 'downloading'
  torrentSummary.name = torrentSummary.displayName || torrentInfo.name
  torrentSummary.path = torrentInfo.path
  torrentSummary.magnetURI = torrentInfo.magnetURI
  // TODO: make torrentInfo immutable, save separately as torrentSummary.info
  // For now, check whether torrentSummary.files has already been set:
  var hasDetailedFileInfo = torrentSummary.files && torrentSummary.files[0].path
  if (!hasDetailedFileInfo) {
    torrentSummary.files = torrentInfo.files
  }
  if (!torrentSummary.selections) {
    torrentSummary.selections = torrentSummary.files.map((x) => true)
  }
  torrentSummary.defaultPlayFileIndex = pickFileToPlay(torrentInfo.files)
  update()

  // Save the .torrent file, if it hasn't been saved already
  if (!torrentSummary.torrentFileName) ipcRenderer.send('wt-save-torrent-file', torrentKey)

  // Auto-generate a poster image, if it hasn't been generated already
  if (!torrentSummary.posterFileName) ipcRenderer.send('wt-generate-torrent-poster', torrentKey)
}

function torrentDone (torrentKey, torrentInfo) {
  // Update the torrent summary
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.status = 'seeding'

  // Notify the user that a torrent finished, but only if we actually DL'd at least part of it.
  // Don't notify if we merely finished verifying data files that were already on disk.
  if (torrentInfo.bytesReceived > 0) {
    if (!state.window.isFocused) {
      state.dock.badge += 1
    }
    showDoneNotification(torrentSummary)
    ipcRenderer.send('downloadFinished', getTorrentPath(torrentSummary))
  }

  update()
}

function torrentProgress (progressInfo) {
  // Overall progress across all active torrents, 0 to 1
  var progress = progressInfo.progress
  var hasActiveTorrents = progressInfo.hasActiveTorrents

  // Hide progress bar when client has no torrents, or progress is 100%
  // TODO: isn't this equivalent to: if (progress === 1) ?
  if (!hasActiveTorrents || progress === 1) {
    progress = -1
  }

  // Show progress bar under the WebTorrent taskbar icon, on OSX
  state.dock.progress = progress

  // Update progress for each individual torrent
  progressInfo.torrents.forEach(function (p) {
    var torrentSummary = getTorrentSummary(p.torrentKey)
    if (!torrentSummary) {
      console.log('warning: got progress for missing torrent %s', p.torrentKey)
      return
    }
    torrentSummary.progress = p
  })

  // TODO: Find an efficient way to re-enable this line, which allows subtitle
  //       files which are completed after a video starts to play to be added
  //       dynamically to the list of subtitles.
  // checkForSubtitles()

  update()
}

function torrentFileModtimes (torrentKey, fileModtimes) {
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.fileModtimes = fileModtimes
  saveStateThrottled()
}

function torrentFileSaved (torrentKey, torrentFileName) {
  console.log('torrent file saved %s: %s', torrentKey, torrentFileName)
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.torrentFileName = torrentFileName
  saveStateThrottled()
}

function torrentPosterSaved (torrentKey, posterFileName) {
  var torrentSummary = getTorrentSummary(torrentKey)
  torrentSummary.posterFileName = posterFileName
  saveStateThrottled()
}

function torrentAudioMetadata (infoHash, index, info) {
  var torrentSummary = getTorrentSummary(infoHash)
  var fileSummary = torrentSummary.files[index]
  fileSummary.audioInfo = info
  update()
}

function torrentServerRunning (serverInfo) {
  state.server = serverInfo
}

// Picks the default file to play from a list of torrent or torrentSummary files
// Returns an index or undefined, if no files are playable
function pickFileToPlay (files) {
  // first, try to find the biggest video file
  var videoFiles = files.filter(TorrentPlayer.isVideo)
  if (videoFiles.length > 0) {
    var largestVideoFile = videoFiles.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    return files.indexOf(largestVideoFile)
  }

  // if there are no videos, play the first audio file
  var audioFiles = files.filter(TorrentPlayer.isAudio)
  if (audioFiles.length > 0) {
    return files.indexOf(audioFiles[0])
  }

  // no video or audio means nothing is playable
  return undefined
}

function playFile (infoHash, index) {
  state.location.go({
    url: 'player',
    onbeforeload: function (cb) {
      play()
      openPlayer(infoHash, index, cb)
    },
    onafterunload: closePlayer
  }, function (err) {
    if (err) onError(err)
  })
}

// Opens the video player to a specific torrent
function openPlayer (infoHash, index, cb) {
  var torrentSummary = getTorrentSummary(infoHash)

  // automatically choose which file in the torrent to play, if necessary
  if (index === undefined) index = torrentSummary.defaultPlayFileIndex
  if (index === undefined) index = pickFileToPlay(torrentSummary.files)
  if (index === undefined) return cb(new errors.UnplayableError())

  // update UI to show pending playback
  if (torrentSummary.progress !== 1) sound.play('PLAY')
  // TODO: remove torrentSummary.playStatus
  torrentSummary.playStatus = 'requested'
  update()

  var timeout = setTimeout(function () {
    telemetry.logPlayAttempt('timeout')
    // TODO: remove torrentSummary.playStatus
    torrentSummary.playStatus = 'timeout' /* no seeders available? */
    sound.play('ERROR')
    cb(new Error('Playback timed out. Try again.'))
    update()
  }, 10000) /* give it a few seconds */

  if (torrentSummary.status === 'paused') {
    startTorrentingSummary(torrentSummary)
    ipcRenderer.once('wt-ready-' + torrentSummary.infoHash,
      () => openPlayerFromActiveTorrent(torrentSummary, index, timeout, cb))
  } else {
    openPlayerFromActiveTorrent(torrentSummary, index, timeout, cb)
  }
}

function openPlayerFromActiveTorrent (torrentSummary, index, timeout, cb) {
  var fileSummary = torrentSummary.files[index]

  // update state
  state.playing.infoHash = torrentSummary.infoHash
  state.playing.fileIndex = index
  state.playing.type = TorrentPlayer.isVideo(fileSummary) ? 'video'
    : TorrentPlayer.isAudio(fileSummary) ? 'audio'
    : 'other'

  // pick up where we left off
  if (fileSummary.currentTime) {
    var fraction = fileSummary.currentTime / fileSummary.duration
    var secondsLeft = fileSummary.duration - fileSummary.currentTime
    if (fraction < 0.9 && secondsLeft > 10) {
      state.playing.jumpToTime = fileSummary.currentTime
    }
  }

  // if it's audio, parse out the metadata (artist, title, etc)
  if (state.playing.type === 'audio' && !fileSummary.audioInfo) {
    ipcRenderer.send('wt-get-audio-metadata', torrentSummary.infoHash, index)
  }

  // if it's video, check for subtitles files that are done downloading
  checkForSubtitles()

  ipcRenderer.send('wt-start-server', torrentSummary.infoHash, index)
  ipcRenderer.once('wt-server-' + torrentSummary.infoHash, function (e, info) {
    clearTimeout(timeout)

    // if we timed out (user clicked play a long time ago), don't autoplay
    var timedOut = torrentSummary.playStatus === 'timeout'
    delete torrentSummary.playStatus
    if (timedOut) {
      ipcRenderer.send('wt-stop-server')
      return update()
    }

    // otherwise, play the video
    state.window.title = torrentSummary.files[state.playing.fileIndex].name
    update()

    ipcRenderer.send('onPlayerOpen')

    cb()
  })
}

function closePlayer () {
  console.log('closePlayer')

  // Quit any external players, like Chromecast/Airplay/etc or VLC
  if (isCasting()) {
    Cast.stop()
  }
  if (state.playing.location === 'vlc') {
    ipcRenderer.send('vlcQuit')
  }

  // Save volume (this session only, not in state.saved)
  state.previousVolume = state.playing.volume

  // Telemetry: track what happens after the user clicks play
  var result = state.playing.result // 'success' or 'error'
  if (result === 'success') telemetry.logPlayAttempt('success') // first frame displayed
  else if (result === 'error') telemetry.logPlayAttempt('error') // codec missing, etc
  else if (result === undefined) telemetry.logPlayAttempt('abandoned') // user exited before first frame
  else console.error('Unknown state.playing.result', state.playing.result)

  // Reset the window contents back to the home screen
  state.window.title = config.APP_WINDOW_TITLE
  state.playing = State.getDefaultPlayState()
  state.server = null

  // Reset the window size and location back to where it was
  if (state.window.isFullScreen) {
    dispatch('toggleFullScreen', false)
  }
  restoreBounds()

  // Tell the WebTorrent process to kill the torrent-to-HTTP server
  ipcRenderer.send('wt-stop-server')

  ipcRenderer.send('onPlayerClose')

  update()
}

function openItem (infoHash, index) {
  var torrentSummary = getTorrentSummary(infoHash)
  var filePath = path.join(
    torrentSummary.path,
    torrentSummary.files[index].path)
  ipcRenderer.send('openItem', filePath)
}

// TODO: use torrentKey, not infoHash
function toggleTorrent (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)
  if (torrentSummary.status === 'paused') {
    torrentSummary.status = 'new'
    startTorrentingSummary(torrentSummary)
    sound.play('ENABLE')
  } else {
    torrentSummary.status = 'paused'
    ipcRenderer.send('wt-stop-torrenting', torrentSummary.infoHash)
    sound.play('DISABLE')
  }
}

// TODO: use torrentKey, not infoHash
function deleteTorrent (infoHash, deleteData) {
  ipcRenderer.send('wt-stop-torrenting', infoHash)

  if (deleteData) {
    var torrentSummary = getTorrentSummary(infoHash)
    moveItemToTrash(torrentSummary)
  }

  var index = state.saved.torrents.findIndex((x) => x.infoHash === infoHash)
  if (index > -1) state.saved.torrents.splice(index, 1)
  saveStateThrottled()
  state.location.clearForward('player') // prevent user from going forward to a deleted torrent
  sound.play('DELETE')
}

function toggleSelectTorrent (infoHash) {
  // toggle selection
  state.selectedInfoHash = state.selectedInfoHash === infoHash ? null : infoHash
  update()
}

function toggleTorrentFile (infoHash, index) {
  var torrentSummary = getTorrentSummary(infoHash)
  torrentSummary.selections[index] = !torrentSummary.selections[index]

  // Let the WebTorrent process know to start or stop fetching that file
  ipcRenderer.send('wt-select-files', infoHash, torrentSummary.selections)
}

function openTorrentContextMenu (infoHash) {
  var torrentSummary = getTorrentSummary(infoHash)
  var menu = new electron.remote.Menu()

  menu.append(new electron.remote.MenuItem({
    label: 'Remove From List',
    click: () => deleteTorrent(torrentSummary.infoHash, false)
  }))

  menu.append(new electron.remote.MenuItem({
    label: 'Remove Data File',
    click: () => deleteTorrent(torrentSummary.infoHash, true)
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

function getTorrentPath (torrentSummary) {
  var itemPath = path.join(torrentSummary.path, torrentSummary.files[0].path)
  if (torrentSummary.files.length > 1) {
    itemPath = path.dirname(itemPath)
  }
  return itemPath
}

function showItemInFolder (torrentSummary) {
  ipcRenderer.send('showItemInFolder', getTorrentPath(torrentSummary))
}

function moveItemToTrash (torrentSummary) {
  ipcRenderer.send('moveItemToTrash', getTorrentPath(torrentSummary))
}

function saveTorrentFileAs (torrentSummary) {
  var newFileName = `${path.parse(torrentSummary.name).name}.torrent`
  var opts = {
    title: 'Save Torrent File',
    defaultPath: path.join(state.saved.prefs.downloadPath, newFileName),
    filters: [
      { name: 'Torrent Files', extensions: ['torrent'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }
  electron.remote.dialog.showSaveDialog(electron.remote.getCurrentWindow(), opts, function (savePath) {
    var torrentPath = TorrentSummary.getTorrentPath(torrentSummary)
    fs.readFile(torrentPath, function (err, torrentFile) {
      if (err) return onError(err)
      fs.writeFile(savePath, torrentFile, function (err) {
        if (err) return onError(err)
      })
    })
  })
}

// Set window dimensions to match video dimensions or fill the screen
function setDimensions (dimensions) {
  // Don't modify the window size if it's already maximized
  if (electron.remote.getCurrentWindow().isMaximized()) {
    state.window.bounds = null
    return
  }

  // Save the bounds of the window for later. See restoreBounds()
  state.window.bounds = {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight
  }
  state.window.wasMaximized = electron.remote.getCurrentWindow().isMaximized

  // Limit window size to screen size
  var screenWidth = window.screen.width
  var screenHeight = window.screen.height
  var aspectRatio = dimensions.width / dimensions.height
  var scaleFactor = Math.min(
    Math.min(screenWidth / dimensions.width, 1),
    Math.min(screenHeight / dimensions.height, 1)
  )
  var width = Math.max(
    Math.floor(dimensions.width * scaleFactor),
    config.WINDOW_MIN_WIDTH
  )
  var height = Math.max(
    Math.floor(dimensions.height * scaleFactor),
    config.WINDOW_MIN_HEIGHT
  )

  ipcRenderer.send('setAspectRatio', aspectRatio)
  ipcRenderer.send('setBounds', {x: null, y: null, width, height})
  state.playing.aspectRatio = aspectRatio
}

function restoreBounds () {
  ipcRenderer.send('setAspectRatio', 0)
  if (state.window.bounds) {
    ipcRenderer.send('setBounds', state.window.bounds, false)
  }
}

function showDoneNotification (torrent) {
  var notif = new window.Notification('Download Complete', {
    body: torrent.name,
    silent: true
  })

  notif.onclick = function () {
    ipcRenderer.send('show')
  }

  sound.play('DONE')
}

// Hide player controls while playing video, if the mouse stays still for a while
// Never hide the controls when:
// * The mouse is over the controls or we're scrubbing (see CSS)
// * The video is paused
// * The video is playing remotely on Chromecast or Airplay
function showOrHidePlayerControls () {
  var hideControls = state.location.url() === 'player' &&
    state.playing.mouseStationarySince !== 0 &&
    new Date().getTime() - state.playing.mouseStationarySince > 2000 &&
    !state.playing.isPaused &&
    state.playing.location === 'local'

  if (hideControls !== state.playing.hideControls) {
    state.playing.hideControls = hideControls
    return true
  }
  return false
}

// Event handlers
function onError (err) {
  console.error(err.stack || err)
  sound.play('ERROR')
  state.errors.push({
    time: new Date().getTime(),
    message: err.message || err
  })
  update()
}

function onWarning (err) {
  console.log('warning: %s', err.message || err)
}

function onPaste (e) {
  if (e.target.tagName.toLowerCase() === 'input') return

  var torrentIds = electron.clipboard.readText().split('\n')
  torrentIds.forEach(function (torrentId) {
    torrentId = torrentId.trim()
    if (torrentId.length === 0) return
    addTorrent(torrentId)
  })

  update()
}

function onFocus (e) {
  state.window.isFocused = true
  state.dock.badge = 0
  update()
}

function onBlur () {
  state.window.isFocused = false
  update()
}

function onVisibilityChange () {
  state.window.isVisible = !document.webkitHidden
}
