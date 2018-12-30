const electron = require('electron')
const path = require('path')
const parallel = require('run-parallel')

const remote = electron.remote

const { dispatch } = require('../lib/dispatcher')
const Subtitles = require('../lib/subtitles')

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
    const subtitles = this.state.playing.subtitles
    subtitles.showMenu = !subtitles.showMenu
  }

  addSubtitles (files, autoSelect) {
    // Subtitles are only supported when playing video files
    if (this.state.playing.type !== 'video') return
    if (files.length === 0) return
    const subtitles = this.state.playing.subtitles

    // Read the files concurrently, then add all resulting subtitle tracks
    const tasks = files.map((file) => (cb) => {
      // TODO use await and try/catch or something?
      Subtitles.loadSubtitle(file).then(track => cb(null, track)).catch(error => cb(error, null))
    })

    parallel(tasks, function (err, tracks) {
      if (err) return dispatch('error', err)

      for (let i = 0; i < tracks.length; i++) {
        // No dupes allowed
        const track = tracks[i]
        let trackIndex = subtitles.tracks.findIndex((t) =>
          track.filePath === t.filePath)

        // Add the track
        if (trackIndex === -1) {
          trackIndex = subtitles.tracks.push(track) - 1
          console.log('sub track added', track)
        }

        // If we're auto-selecting a track, try to find one in the user's language
        if (autoSelect && (i === 0 || isSystemLanguage(track.language))) {
          subtitles.selectedIndex = trackIndex
        }
      }

      // Finally, make sure no two tracks have the same label
      relabelSubtitles(subtitles)
    })
  }

  async checkForSubtitles () {
    if (this.state.playing.type !== 'video') return
    const torrentSummary = this.state.getPlayingTorrentSummary()
    if (!torrentSummary || !torrentSummary.progress) return

    Subtitles.getSubtitleFiles(torrentSummary.files).forEach(file => {
      const filePath = path.join(torrentSummary.path, file.path)

      // User has configured these subtitle languages in config, so auto enable
      const enable = Subtitles.getDownloadedSubtitleFileNames(torrentSummary.name).includes(file.name)

      this.addSubtitles([filePath], enable)
    })
  }
}

// Checks whether a language name like 'English' or 'German' matches the system
// language, aka the current locale
function isSystemLanguage (language) {
  const iso639 = require('iso-639-1')
  const osLangISO = window.navigator.language.split('-')[0] // eg 'en'
  const langIso = iso639.getCode(language) // eg 'de' if language is 'German'
  return langIso === osLangISO
}

// Make sure we don't have two subtitle tracks with the same label
// Labels each track by language, eg 'German', 'English', 'English 2', ...
function relabelSubtitles (subtitles) {
  const counts = {}
  subtitles.tracks.forEach(function (track) {
    const lang = track.language
    counts[lang] = (counts[lang] || 0) + 1
    track.label = counts[lang] > 1 ? (lang + ' ' + counts[lang]) : lang
  })
}
