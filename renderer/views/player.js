module.exports = Player

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var prettyBytes = require('prettier-bytes')
var Bitfield = require('bitfield')

var TorrentSummary = require('../lib/torrent-summary')
var {dispatch, dispatcher} = require('../lib/dispatcher')

// Shows a streaming video player. Standard features + Chromecast + Airplay
function Player (state) {
  // Show the video as large as will fit in the window, play immediately
  // If the video is on Chromecast or Airplay, show a title screen instead
  var showVideo = state.playing.location === 'local'
  return hx`
    <div
      class='player'
      onwheel=${handleVolumeWheel}
      onmousemove=${dispatcher('mediaMouseMoved')}>
      ${showVideo ? renderMedia(state) : renderCastScreen(state)}
      ${renderPlayerControls(state)}
      </div>
  `
}

// Handles volume change by wheel
function handleVolumeWheel (e) {
  dispatch('changeVolume', (-e.deltaY | e.deltaX) / 500)
}

function renderMedia (state) {
  if (!state.server) return

  // Unfortunately, play/pause can't be done just by modifying HTML.
  // Instead, grab the DOM node and play/pause it if necessary
  var mediaElement = document.querySelector(state.playing.type) /* get the <video> or <audio> tag */
  if (mediaElement !== null) {
    if (state.playing.isPaused && !mediaElement.paused) {
      mediaElement.pause()
    } else if (!state.playing.isPaused && mediaElement.paused) {
      mediaElement.play()
    }
    // When the user clicks or drags on the progress bar, jump to that position
    if (state.playing.jumpToTime) {
      mediaElement.currentTime = state.playing.jumpToTime
      state.playing.jumpToTime = null
    }
    // Set volume
    if (state.playing.setVolume !== null && isFinite(state.playing.setVolume)) {
      mediaElement.volume = state.playing.setVolume
      state.playing.setVolume = null
    }

    // fix textTrack cues not been removed <track> rerender
    if (state.playing.subtitles.change) {
      var tracks = mediaElement.textTracks
      for (var j = 0; j < tracks.length; j++) {
        // mode is not an <track> attribute, only available on DOM
        tracks[j].mode = (tracks[j].label === state.playing.subtitles.change) ? 'showing' : 'hidden'
      }
      state.playing.subtitles.change = null
    }

    state.playing.currentTime = mediaElement.currentTime
    state.playing.duration = mediaElement.duration
    state.playing.volume = mediaElement.volume
  }

  // Add subtitles to the <video> tag
  var trackTags = []

  if (state.playing.subtitles.enabled && state.playing.subtitles.tracks.length > 0) {
    for (var i = 0; i < state.playing.subtitles.tracks.length; i++) {
      var track = state.playing.subtitles.tracks[i]
      trackTags.push(hx`
        <track
          ${track.selected ? 'default' : ''}
          label=${track.label}
          type='subtitles'
          src=${track.buffer}>
      `)
    }
  }

  // Create the <audio> or <video> tag
  var mediaTag = hx`
    <div
      src='${state.server.localURL}'
      ondblclick=${dispatcher('toggleFullScreen')}
      onloadedmetadata=${onLoadedMetadata}
      onended=${onEnded}
      onstalling=${dispatcher('mediaStalled')}
      onerror=${dispatcher('mediaError')}
      ontimeupdate=${dispatcher('mediaTimeUpdate')}
      onencrypted=${dispatcher('mediaEncrypted')}
      oncanplay=${onCanPlay}>
      ${trackTags}
    </div>
  `
  mediaTag.tagName = state.playing.type // conditional tag name

  // Show the media.
  return hx`
    <div
      class='letterbox'
      onmousemove=${dispatcher('mediaMouseMoved')}>
      ${mediaTag}
      ${renderOverlay(state)}
    </div>
  `

  // As soon as the video loads enough to know the video dimensions, resize the window
  function onLoadedMetadata (e) {
    if (state.playing.type !== 'video') return
    var video = e.target
    var dimensions = {
      width: video.videoWidth,
      height: video.videoHeight
    }
    dispatch('setDimensions', dimensions)
  }

  // When the video completes, pause the video instead of looping
  function onEnded (e) {
    state.playing.isPaused = true
  }

  function onCanPlay (e) {
    var video = e.target
    if (video.webkitVideoDecodedByteCount > 0 &&
      video.webkitAudioDecodedByteCount === 0) {
      dispatch('mediaError', 'Audio codec unsupported')
    } else {
      video.play()
    }
  }
}

function renderOverlay (state) {
  var elems = []
  var audioMetadataElem = renderAudioMetadata(state)
  var spinnerElem = renderLoadingSpinner(state)
  if (audioMetadataElem) elems.push(audioMetadataElem)
  if (spinnerElem) elems.push(spinnerElem)

  // Video fills the window, centered with black bars if necessary
  // Audio gets a static poster image and a summary of the file metadata.
  var style
  if (state.playing.type === 'audio') {
    style = { backgroundImage: cssBackgroundImagePoster(state) }
  } else if (elems.length !== 0) {
    style = { backgroundImage: cssBackgroundImageDarkGradient() }
  } else {
    return /* Video, not audio, and it isn't stalled, so no spinner. No overlay needed. */
  }

  return hx`
    <div class='media-overlay-background' style=${style}>
      <div class='media-overlay'>${elems}</div>
    </div>
  `
}

function renderAudioMetadata (state) {
  var torrentSummary = getPlayingTorrentSummary(state)
  var fileSummary = torrentSummary.files[state.playing.fileIndex]
  if (!fileSummary.audioInfo) return
  var info = fileSummary.audioInfo

  // Get audio track info
  var title = info.title
  if (!title) {
    title = fileSummary.name
  }
  var artist = info.artist && info.artist[0]
  var album = info.album
  if (album && info.year && !album.includes(info.year)) {
    album += ' (' + info.year + ')'
  }
  var track
  if (info.track && info.track.no && info.track.of) {
    track = info.track.no + ' of ' + info.track.of
  }

  // Show a small info box in the middle of the screen with title/album/artist/etc
  var elems = []
  if (artist) elems.push(hx`<div class='audio-artist'><label>Artist</label>${artist}</div>`)
  if (album) elems.push(hx`<div class='audio-album'><label>Album</label>${album}</div>`)
  if (track) elems.push(hx`<div class='audio-track'><label>Track</label>${track}</div>`)

  // Align the title with the artist/etc info, if available. Otherwise, center the title
  var emptyLabel = hx`<label></label>`
  elems.unshift(hx`<div class='audio-title'>${elems.length ? emptyLabel : undefined}${title}</div>`)

  return hx`<div class='audio-metadata'>${elems}</div>`
}

function renderLoadingSpinner (state) {
  if (state.playing.isPaused) return
  var isProbablyStalled = state.playing.isStalled ||
    (new Date().getTime() - state.playing.lastTimeUpdate > 2000)
  if (!isProbablyStalled) return

  var prog = getPlayingTorrentSummary(state).progress || {}
  var fileProgress = 0
  if (prog.files) {
    var file = prog.files[state.playing.fileIndex]
    fileProgress = Math.floor(100 * file.numPiecesPresent / file.numPieces)
  }

  return hx`
    <div class='media-stalled'>
      <div class='loading-spinner'>&nbsp;</div>
      <div class='loading-status ellipsis'>
        <span class='progress'>${fileProgress}%</span> downloaded,
        <span>↓ ${prettyBytes(prog.downloadSpeed || 0)}/s</span>
        <span>↑ ${prettyBytes(prog.uploadSpeed || 0)}/s</span>
      </div>
    </div>
  `
}

function renderCastScreen (state) {
  var castIcon, castType, isCast
  if (state.playing.location.startsWith('chromecast')) {
    castIcon = 'cast_connected'
    castType = 'Chromecast'
    isCast = true
  } else if (state.playing.location.startsWith('airplay')) {
    castIcon = 'airplay'
    castType = 'AirPlay'
    isCast = true
  } else if (state.playing.location.startsWith('dlna')) {
    castIcon = 'tv'
    castType = 'DLNA'
    isCast = true
  } else if (state.playing.location === 'vlc') {
    castIcon = 'tv'
    castType = 'VLC'
    isCast = false
  } else if (state.playing.location === 'error') {
    castIcon = 'error_outline'
    castType = 'Error'
    isCast = false
  }

  var isStarting = state.playing.location.endsWith('-pending')
  var castStatus
  if (isCast) castStatus = isStarting ? 'Connecting...' : 'Connected'
  else castStatus = ''

  // Show a nice title image, if possible
  var style = {
    backgroundImage: cssBackgroundImagePoster(state)
  }

  return hx`
    <div class='letterbox' style=${style}>
      <div class='cast-screen'>
        <i class='icon'>${castIcon}</i>
        <div class='cast-type'>${castType}</div>
        <div class='cast-status'>${castStatus}</div>
      </div>
    </div>
  `
}

function renderSubtitlesOptions (state) {
  var subtitles = state.playing.subtitles
  if (!subtitles.tracks.length || !subtitles.show) return

  var items = subtitles.tracks.map(function (track) {
    return hx`
      <li onclick=${dispatcher('selectSubtitle', track.label)}>
        <i.icon>${track.selected ? 'radio_button_checked' : 'radio_button_unchecked'}</i>
        ${track.label}
      </li>
    `
  })

  return hx`
    <ul.subtitles-list>
      ${items}
      <li onclick=${dispatcher('selectSubtitle', '')}>
        <i.icon>${!subtitles.enabled ? 'radio_button_checked' : 'radio_button_unchecked'}</i>
        None
      </li>
    </ul>
  `
}

function renderPlayerControls (state) {
  var positionPercent = 100 * state.playing.currentTime / state.playing.duration
  var playbackCursorStyle = { left: 'calc(' + positionPercent + '% - 8px)' }
  var captionsClass = state.playing.subtitles.tracks.length === 0
    ? 'disabled'
    : state.playing.subtitles.enabled
      ? 'active'
      : ''

  var elements = [
    hx`
      <div class='playback-bar'>
        ${renderLoadingBar(state)}
        <div class='playback-cursor' style=${playbackCursorStyle}></div>
        <div class='scrub-bar'
          draggable='true'
          onclick=${handleScrub},
          ondrag=${handleScrub}></div>
      </div>
    `,
    hx`
      <i class='icon fullscreen'
        onclick=${dispatcher('toggleFullScreen')}>
        ${state.window.isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
      </i>
    `
  ]

  if (state.playing.type === 'video') {
    // show closed captions icon
    elements.push(hx`
      <i.icon.closed-captions
        class=${captionsClass}
        onclick=${handleSubtitles}>
        closed_captions
      </i>
    `)
  }

  // If we've detected a Chromecast or AppleTV, the user can play video there
  var isOnChromecast = state.playing.location.startsWith('chromecast')
  var isOnAirplay = state.playing.location.startsWith('airplay')
  var isOnDlna = state.playing.location.startsWith('dlna')
  var chromecastClass, chromecastHandler, airplayClass, airplayHandler, dlnaClass, dlnaHandler
  if (isOnChromecast) {
    chromecastClass = 'active'
    dlnaClass = 'disabled'
    airplayClass = 'disabled'
    chromecastHandler = dispatcher('closeDevice')
    airplayHandler = undefined
    dlnaHandler = undefined
  } else if (isOnAirplay) {
    chromecastClass = 'disabled'
    dlnaClass = 'disabled'
    airplayClass = 'active'
    chromecastHandler = undefined
    airplayHandler = dispatcher('closeDevice')
    dlnaHandler = undefined
  } else if (isOnDlna) {
    chromecastClass = 'disabled'
    dlnaClass = 'active'
    airplayClass = 'disabled'
    chromecastHandler = undefined
    airplayHandler = undefined
    dlnaHandler = dispatcher('closeDevice')
  } else {
    chromecastClass = ''
    airplayClass = ''
    dlnaClass = ''
    chromecastHandler = dispatcher('openDevice', 'chromecast')
    airplayHandler = dispatcher('openDevice', 'airplay')
    dlnaHandler = dispatcher('openDevice', 'dlna')
  }
  if (state.devices.chromecast || isOnChromecast) {
    var castIcon = isOnChromecast ? 'cast_connected' : 'cast'
    elements.push(hx`
      <i.icon.device
        class=${chromecastClass}
        onclick=${chromecastHandler}>
        ${castIcon}
      </i>
    `)
  }
  if (state.devices.airplay || isOnAirplay) {
    elements.push(hx`
      <i.icon.device
        class=${airplayClass}
        onclick=${airplayHandler}>
        airplay
      </i>
    `)
  }
  if (state.devices.dlna || isOnDlna) {
    elements.push(hx`
      <i.icon.device
        class=${dlnaClass}
        onclick=${dlnaHandler}>
        tv
      </i>
    `)
  }

  // On OSX, the back button is in the title bar of the window; see app.js
  // On other platforms, we render one over the video on mouseover
  if (process.platform !== 'darwin') {
    elements.push(hx`
      <i.icon.back
        onclick=${dispatcher('back')}>
        chevron_left
      </i>
    `)
  }

  // render volume
  var volume = state.playing.volume
  var volumeIcon = 'volume_' + (volume === 0 ? 'off' : volume < 0.3 ? 'mute' : volume < 0.6 ? 'down' : 'up')
  var volumeStyle = { background: '-webkit-gradient(linear, left top, right top, ' +
    'color-stop(' + (volume * 100) + '%, #eee), ' +
    'color-stop(' + (volume * 100) + '%, #727272))'
  }

  elements.push(hx`
    <div.volume>
        <i.icon.volume-icon onmousedown=${handleVolumeMute}>
          ${volumeIcon}
        </i>
        <input.volume-slider
          type='range' min='0' max='1' step='0.05' value=${volumeChanging !== false ? volumeChanging : volume}
          onmousedown=${handleVolumeScrub}
          onmouseup=${handleVolumeScrub}
          onmousemove=${handleVolumeScrub}
          style=${volumeStyle}
        />
    </div>
  `)

  // Finally, the big button in the center plays or pauses the video
  elements.push(hx`
    <i class='icon play-pause' onclick=${dispatcher('playPause')}>
      ${state.playing.isPaused ? 'play_arrow' : 'pause'}
    </i>
  `)

  return hx`
    <div class='player-controls'>
      ${elements}
      ${renderSubtitlesOptions(state)}
    </div>
  `

  // Handles a click or drag to scrub (jump to another position in the video)
  function handleScrub (e) {
    dispatch('mediaMouseMoved')
    var windowWidth = document.querySelector('body').clientWidth
    var fraction = e.clientX / windowWidth
    var position = fraction * state.playing.duration /* seconds */
    dispatch('playbackJump', position)
  }

  // Handles volume muting and Unmuting
  function handleVolumeMute (e) {
    if (state.playing.volume === 0.0) {
      dispatch('setVolume', 1.0)
    } else {
      dispatch('setVolume', 0.0)
    }
  }

  // Handles volume slider scrub
  function handleVolumeScrub (e) {
    switch (e.type) {
      case 'mouseup':
        volumeChanging = false
        dispatch('setVolume', e.offsetX / 50)
        break
      case 'mousedown':
        volumeChanging = this.value
        break
      case 'mousemove':
        // only change if move was started by click
        if (volumeChanging !== false) {
          volumeChanging = this.value
        }
        break
    }
  }

  function handleSubtitles (e) {
    if (!state.playing.subtitles.tracks.length || e.ctrlKey || e.metaKey) {
      // if no subtitles available select it
      dispatch('openSubtitles')
    } else {
      dispatch('showSubtitles')
    }
  }
}

// lets scrub without sending to volume backend
var volumeChanging = false

// Renders the loading bar. Shows which parts of the torrent are loaded, which
// can be "spongey" / non-contiguous
function renderLoadingBar (state) {
  var torrentSummary = getPlayingTorrentSummary(state)
  if (!torrentSummary.progress) {
    return []
  }

  // Find all contiguous parts of the torrent which are loaded
  var prog = torrentSummary.progress
  var fileProg = prog.files[state.playing.fileIndex]
  var parts = []
  var lastPiecePresent = false
  for (var i = fileProg.startPiece; i <= fileProg.endPiece; i++) {
    var partPresent = Bitfield.prototype.get.call(prog.bitfield, i)
    if (partPresent && !lastPiecePresent) {
      parts.push({start: i - fileProg.startPiece, count: 1})
    } else if (partPresent) {
      parts[parts.length - 1].count++
    }
    lastPiecePresent = partPresent
  }

  // Output some bars to show which parts of the file are loaded
  return hx`
    <div class='loading-bar'>
      ${parts.map(function (part) {
        var style = {
          left: (100 * part.start / fileProg.numPieces) + '%',
          width: (100 * part.count / fileProg.numPieces) + '%'
        }

        return hx`<div class='loading-bar-part' style=${style}></div>`
      })}
    </div>
  `
}

// Returns the CSS background-image string for a poster image + dark vignette
function cssBackgroundImagePoster (state) {
  var torrentSummary = getPlayingTorrentSummary(state)
  var posterPath = TorrentSummary.getPosterPath(torrentSummary)
  if (!posterPath) return ''
  return cssBackgroundImageDarkGradient() + `, url(${posterPath})`
}

function cssBackgroundImageDarkGradient () {
  return 'radial-gradient(circle at center, ' +
    'rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 100%)'
}

function getPlayingTorrentSummary (state) {
  var infoHash = state.playing.infoHash
  return state.saved.torrents.find((x) => x.infoHash === infoHash)
}
