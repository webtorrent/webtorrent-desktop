const electron = require('electron')
const fs = require('fs-extra')
const path = require('path')
const parallel = require('run-parallel')
const zeroFill = require('zero-fill')

const remote = electron.remote
const ipcRenderer = electron.ipcRenderer

const {dispatch} = require('../lib/dispatcher')

module.exports = class SubtitlesController {
  constructor (state) {
    this.state = state
  }

  openSubtitles () {
    remote.dialog.showOpenDialog({
      title: 'Select a subtitles file.',
      filters: [ { name: 'Subtitles', extensions: ['vtt', 'srt'] } ],
      properties: [ 'openFile' ]
    }, (filenames) => {
      if (!Array.isArray(filenames)) return
      this.addSubtitles(filenames, true)
    })
  }

  selectSubtitle (ix) {
    this.state.playing.subtitles.selectedIndex = ix
  }

  toggleSubtitlesMenu () {
    var subtitles = this.state.playing.subtitles
    subtitles.showMenu = !subtitles.showMenu
  }

  addSubtitles (files, autoSelect) {
    var state = this.state
    // Subtitles are only supported when playing video files
    if (state.playing.type !== 'video') return
    if (files.length === 0) return
    var subtitles = state.playing.subtitles

    // Read the files concurrently, then add all resulting subtitle tracks
    var tasks = files.map((file) => (cb) => loadSubtitle(file, cb))
    parallel(tasks, function (err, tracks) {
      if (err) return dispatch('error', err)

      for (var i = 0; i < tracks.length; i++) {
        // No dupes allowed
        var track = tracks[i]
        var trackIndex = state.playing.subtitles.tracks
          .findIndex((t) => track.filePath === t.filePath)

        // Add the track
        if (trackIndex === -1) {
          trackIndex = state.playing.subtitles.tracks.push(track) - 1
        }

        // If we're auto-selecting a track, try to find one in the user's language
        if (autoSelect && (i === 0 || isSystemLanguage(track.language))) {
          state.playing.subtitles.selectedIndex = trackIndex
        }
      }

      // Finally, make sure no two tracks have the same label
      relabelSubtitles(subtitles)
    })
  }

  checkForSubtitles () {
    if (this.state.playing.type !== 'video') return
    var torrentSummary = this.state.getPlayingTorrentSummary()
    if (!torrentSummary || !torrentSummary.progress) return

    torrentSummary.progress.files.forEach((fp, ix) => {
      if (fp.numPieces !== fp.numPiecesPresent) return // ignore incomplete files
      var file = torrentSummary.files[ix]
      if (this.state.playing.fileIndex === ix) return this.checkForEmbeddedMKVSubtitles(file)
      if (!this.isSubtitle(file.name)) return
      var filePath = path.join(torrentSummary.path, file.path)
      this.addSubtitles([filePath], false)
    })
  }

  isSubtitle (file) {
    var name = typeof file === 'string' ? file : file.name
    var ext = path.extname(name).toLowerCase()
    return ext === '.srt' || ext === '.vtt'
  }

  checkForEmbeddedMKVSubtitles (file) {
    var playing = this.state.playing
    // var playingFile = this.state.getPlayingFileSummary()
    // var playingPath = path.join(torrentSummary.path, playingFile.path)

    if (path.extname(file.name).toLowerCase() === '.mkv') {
      ipcRenderer.send('wt-get-mkv-subtitles', playing.infoHash, playing.fileIndex)

      ipcRenderer.once('wt-mkv-subtitles', function (e, tracks) {
        tracks.forEach(function (trackEntry) {
          var track = loadEmbeddedSubtitle(trackEntry)
          console.log('loaded emb subs', track)
          playing.subtitles.tracks.push(track)
        })

        if (tracks.length > 0) relabelSubtitles(playing.subtitles)
      })
    }
  }
}

function loadSubtitle (file, cb) {
  // Lazy load to keep startup fast
  var concat = require('simple-concat')
  var srtToVtt = require('srt-to-vtt')

  // Read the .SRT or .VTT file, parse it, add subtitle track
  var filePath = file.path || file

  var vttStream = fs.createReadStream(filePath).pipe(srtToVtt())

  concat(vttStream, function (err, buf) {
    if (err) return dispatch('error', 'Can\'t parse subtitles file.')

    var langDetected = detectVTTLanguage(buf)

    var track = {
      buffer: 'data:text/vtt;base64,' + buf.toString('base64'),
      language: langDetected,
      label: langDetected,
      filePath: filePath
    }

    cb(null, track)
  })
}

// Checks whether a language name like 'English' or 'German' matches the system
// language, aka the current locale
function isSystemLanguage (language) {
  var iso639 = require('iso-639-1')
  var osLangISO = window.navigator.language.split('-')[0] // eg 'en'
  var langIso = iso639.getCode(language) // eg 'de' if language is 'German'
  return langIso === osLangISO
}

// Make sure we don't have two subtitle tracks with the same label
// Labels each track by language, eg 'German', 'English', 'English 2', ...
function relabelSubtitles (subtitles) {
  var counts = {}
  subtitles.tracks.forEach(function (track) {
    var lang = track.language
    counts[lang] = (counts[lang] || 0) + 1
    track.label = counts[lang] > 1 ? (lang + ' ' + counts[lang]) : lang
  })
}

function detectVTTLanguage (buffer) {
  var LanguageDetect = require('languagedetect')

  // Detect what language the subtitles are in
  var vttContents = buffer.toString().replace(/(.*-->.*)/g, '') // remove numbers?
  var langDetected = (new LanguageDetect()).detect(vttContents, 2)
  langDetected = langDetected.length ? langDetected[0][0] : 'subtitle'
  langDetected = langDetected.slice(0, 1).toUpperCase() + langDetected.slice(1)

  return langDetected
}

function loadEmbeddedSubtitle (trackEntry) {
  // convert to .vtt format
  var vtt = 'WEBVTT FILE\r\n\r\n'
  trackEntry.subtitles.forEach(function (sub, i) {
    vtt += `${i + 1}\r\n`
    vtt += `${msToTime(sub.time)} --> ${msToTime(sub.time + sub.duration)}\r\n`
    vtt += `${sub.text}\r\n\r\n`
  })

  function msToTime (s) {
    var ms = s % 1000
    s = (s - ms) / 1000
    var secs = s % 60
    s = (s - secs) / 60
    var mins = s % 60
    var hrs = (s - mins) / 60

    var z = zeroFill
    return z(2, hrs) + ':' + z(2, mins) + ':' + z(2, secs) + '.' + z(3, ms)
  }

  var buf = new Buffer(vtt)
  var langDetected = detectVTTLanguage(buf)

  var track = {
    buffer: 'data:text/vtt;base64,' + buf.toString('base64'),
    language: langDetected,
    label: langDetected,
    filePath: null
  }

  return track
}
