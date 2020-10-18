const React = require('react')
const Bitfield = require('bitfield')
const prettyBytes = require('prettier-bytes')

const TorrentSummary = require('../lib/torrent-summary')
const Playlist = require('../lib/playlist')
const { dispatch, dispatcher } = require('../lib/dispatcher')
const config = require('../../config')

// Shows a streaming video player. Standard features + Chromecast + Airplay
module.exports = class Player extends React.Component {
  render () {
    // Show the video as large as will fit in the window, play immediately
    // If the video is on Chromecast or Airplay, show a title screen instead
    const state = this.props.state
    const showVideo = state.playing.location === 'local'
    const showControls = state.playing.location !== 'external'
    return (
      <div
        className='player'
        onWheel={handleVolumeWheel}
        onMouseMove={dispatcher('mediaMouseMoved')}
      >
        {showVideo ? renderMedia(state) : renderCastScreen(state)}
        {showControls ? renderPlayerControls(state) : null}
      </div>
    )
  }

  onComponentWillUnmount () {
    // Unload the media element so that Chromium stops trying to fetch data
    const tag = document.querySelector('audio,video')
    if (!tag) return
    tag.pause()
    tag.src = ''
    tag.load()
  }
}

// Handles volume change by wheel
function handleVolumeWheel (e) {
  dispatch('changeVolume', (-e.deltaY | e.deltaX) / 500)
}

function renderMedia (state) {
  if (!state.server) return

  // Unfortunately, play/pause can't be done just by modifying HTML.
  // Instead, grab the DOM node and play/pause it if necessary
  // Get the <video> or <audio> tag
  const mediaElement = document.querySelector(state.playing.type)
  if (mediaElement !== null) {
    if (state.playing.isPaused && !mediaElement.paused) {
      mediaElement.pause()
    } else if (!state.playing.isPaused && mediaElement.paused) {
      mediaElement.play()
    }
    // When the user clicks or drags on the progress bar, jump to that position
    if (state.playing.jumpToTime != null) {
      mediaElement.currentTime = state.playing.jumpToTime
      state.playing.jumpToTime = null
    }
    if (state.playing.playbackRate !== mediaElement.playbackRate) {
      mediaElement.playbackRate = state.playing.playbackRate
    }
    // Recover previous volume
    if (state.previousVolume !== null && isFinite(state.previousVolume)) {
      mediaElement.volume = state.previousVolume
      state.previousVolume = null
    }

    // Set volume
    if (state.playing.setVolume !== null && isFinite(state.playing.setVolume)) {
      mediaElement.volume = state.playing.setVolume
      state.playing.setVolume = null
    }

    // Switch to the newly added subtitle track, if available
    const tracks = mediaElement.textTracks || []
    for (let j = 0; j < tracks.length; j++) {
      const isSelectedTrack = j === state.playing.subtitles.selectedIndex
      tracks[j].mode = isSelectedTrack ? 'showing' : 'hidden'
    }

    // Save video position
    const file = state.getPlayingFileSummary()
    file.currentTime = state.playing.currentTime = mediaElement.currentTime
    file.duration = state.playing.duration = mediaElement.duration

    // Save selected subtitle
    if (state.playing.subtitles.selectedIndex !== -1) {
      const index = state.playing.subtitles.selectedIndex
      file.selectedSubtitle = state.playing.subtitles.tracks[index].filePath
    } else if (file.selectedSubtitle != null) {
      delete file.selectedSubtitle
    }

    // Switch to selected audio track
    const audioTracks = mediaElement.audioTracks || []
    for (let j = 0; j < audioTracks.length; j++) {
      const isSelectedTrack = j === state.playing.audioTracks.selectedIndex
      audioTracks[j].enabled = isSelectedTrack
    }

    state.playing.volume = mediaElement.volume
  }

  // Add subtitles to the <video> tag
  const trackTags = []
  if (state.playing.subtitles.selectedIndex >= 0) {
    for (let i = 0; i < state.playing.subtitles.tracks.length; i++) {
      const track = state.playing.subtitles.tracks[i]
      const isSelected = state.playing.subtitles.selectedIndex === i
      trackTags.push(
        <track
          key={i}
          default={isSelected}
          label={track.label}
          kind='subtitles'
          src={track.buffer}
        />
      )
    }
  }

  // Create the <audio> or <video> tag
  const MediaTagName = state.playing.type
  const mediaTag = (
    <MediaTagName
      src={Playlist.getCurrentLocalURL(state)}
      onDoubleClick={dispatcher('toggleFullScreen')}
      onClick={() => {state.playing.isPaused = !state.playing.isPaused}}
      onLoadedMetadata={onLoadedMetadata}
      onEnded={onEnded}
      onStalled={dispatcher('mediaStalled')}
      onError={dispatcher('mediaError')}
      onTimeUpdate={dispatcher('mediaTimeUpdate')}
      onEncrypted={dispatcher('mediaEncrypted')}
    >
      {trackTags}
    </MediaTagName>
  )

  // Show the media.
  return (
    <div
      key='letterbox'
      className='letterbox'
      onMouseMove={dispatcher('mediaMouseMoved')}
    >
      {mediaTag}
      {renderOverlay(state)}
    </div>
  )

  function onLoadedMetadata (e) {
    const mediaElement = e.target

    // check if we can decode video and audio track
    if (state.playing.type === 'video') {
      if (mediaElement.videoTracks.length === 0) {
        dispatch('mediaError', 'Video codec unsupported')
      }

      if (mediaElement.audioTracks.length === 0) {
        dispatch('mediaError', 'Audio codec unsupported')
      }

      dispatch('mediaSuccess')

      const dimensions = {
        width: mediaElement.videoWidth,
        height: mediaElement.videoHeight
      }

      // As soon as we know the video dimensions, resize the window
      dispatch('setDimensions', dimensions)

      // set audioTracks
      const tracks = []
      for (let i = 0; i < mediaElement.audioTracks.length; i++) {
        tracks.push({
          label: mediaElement.audioTracks[i].label || `Track ${i + 1}`,
          language: mediaElement.audioTracks[i].language
        })
      }

      state.playing.audioTracks.tracks = tracks
      state.playing.audioTracks.selectedIndex = 0
    }

    // check if we can decode audio track
    if (state.playing.type === 'audio') {
      if (mediaElement.audioTracks.length === 0) {
        dispatch('mediaError', 'Audio codec unsupported')
      }

      dispatch('mediaSuccess')
    }
  }

  function onEnded (e) {
    if (Playlist.hasNext(state)) {
      dispatch('nextTrack')
    } else {
      // When the last video completes, pause the video instead of looping
      state.playing.isPaused = true
      if (state.window.isFullScreen) dispatch('toggleFullScreen')
    }
  }
}

function renderOverlay (state) {
  const elems = []
  const audioMetadataElem = renderAudioMetadata(state)
  const spinnerElem = renderLoadingSpinner(state)
  if (audioMetadataElem) elems.push(audioMetadataElem)
  if (spinnerElem) elems.push(spinnerElem)

  // Video fills the window, centered with black bars if necessary
  // Audio gets a static poster image and a summary of the file metadata.
  let style
  if (state.playing.type === 'audio') {
    style = { backgroundImage: cssBackgroundImagePoster(state) }
  } else if (elems.length !== 0) {
    style = { backgroundImage: cssBackgroundImageDarkGradient() }
  } else {
    // Video playing, so no spinner. No overlay needed
    return
  }

  return (
    <div key='overlay' className='media-overlay-background' style={style}>
      <div className='media-overlay'>{elems}</div>
    </div>
  )
}

/**
 * Render track or disk number string
 * @param common metadata.common part
 * @param key should be either 'track' or 'disk'
 * @return track or disk number metadata as JSX block
 */
function renderTrack (common, key) {
  // Audio metadata: track-number
  if (common[key] && common[key].no) {
    let str = `${common[key].no}`
    if (common[key].of) {
      str += ` of ${common[key].of}`
    }
    const style = { textTransform: 'capitalize' }
    return (
      <div className={`audio-${key}`}>
        <label style={style}>{key}</label> {str}
      </div>
    )
  }
}

function renderAudioMetadata (state) {
  const fileSummary = state.getPlayingFileSummary()
  if (!fileSummary.audioInfo) return
  const common = fileSummary.audioInfo.common || {}

  // Get audio track info
  const title = common.title ? common.title : fileSummary.name

  // Show a small info box in the middle of the screen with title/album/etc
  const elems = []

  // Audio metadata: artist(s)
  const artist = common.artist || common.albumartist
  if (artist) {
    elems.push((
      <div key='artist' className='audio-artist'>
        <label>Artist</label>{artist}
      </div>
    ))
  }

  // Audio metadata: disk & track-number
  const count = ['track', 'disk']
  count.forEach(key => {
    const nrElem = renderTrack(common, key)
    if (nrElem) {
      elems.push(nrElem)
    }
  })

  // Audio metadata: album
  if (common.album) {
    elems.push((
      <div key='album' className='audio-album'>
        <label>Album</label>{common.album}
      </div>
    ))
  }

  // Audio metadata: year
  if (common.year) {
    elems.push((
      <div key='year' className='audio-year'>
        <label>Year</label>{common.year}
      </div>
    ))
  }

  // Audio metadata: release information (label & catalog-number)
  if (common.label || common.catalognumber) {
    const releaseInfo = []
    if (common.label && common.catalognumber &&
      common.label.length === common.catalognumber.length) {
      // Assume labels & catalog-numbers are pairs
      for (let n = 0; n < common.label.length; ++n) {
        releaseInfo.push(common.label[0] + ' / ' + common.catalognumber[n])
      }
    } else {
      if (common.label) {
        releaseInfo.push(...common.label)
      }
      if (common.catalognumber) {
        releaseInfo.push(...common.catalognumber)
      }
    }
    elems.push((
      <div key='release' className='audio-release'>
        <label>Release</label>{releaseInfo.join(', ')}
      </div>
    ))
  }

  // Audio metadata: format
  const format = []
  fileSummary.audioInfo.format = fileSummary.audioInfo.format || ''
  if (fileSummary.audioInfo.format.container) {
    format.push(fileSummary.audioInfo.format.container)
  }
  if (fileSummary.audioInfo.format.codec &&
    fileSummary.audioInfo.format.container !== fileSummary.audioInfo.format.codec) {
    format.push(fileSummary.audioInfo.format.codec)
  }
  if (fileSummary.audioInfo.format.bitrate) {
    format.push(Math.round(fileSummary.audioInfo.format.bitrate / 1000) + ' kbps') // 128 kbps
  }
  if (fileSummary.audioInfo.format.sampleRate) {
    format.push(Math.round(fileSummary.audioInfo.format.sampleRate / 100) / 10 + ' kHz')
  }
  if (fileSummary.audioInfo.format.bitsPerSample) {
    format.push(fileSummary.audioInfo.format.bitsPerSample + ' bit')
  }
  if (format.length > 0) {
    elems.push((
      <div key='format' className='audio-format'>
        <label>Format</label>{format.join(', ')}
      </div>
    ))
  }

  // Audio metadata: comments
  if (common.comment) {
    elems.push((
      <div key='comments' className='audio-comments'>
        <label>Comments</label>{common.comment.join(' / ')}
      </div>
    ))
  }

  // Align the title with the other info, if available. Otherwise, center title
  const emptyLabel = (<label />)
  elems.unshift((
    <div key='title' className='audio-title'>
      {elems.length ? emptyLabel : undefined}{title}
    </div>
  ))

  return (<div key='audio-metadata' className='audio-metadata'>{elems}</div>)
}

function renderLoadingSpinner (state) {
  if (state.playing.isPaused) return
  const isProbablyStalled = state.playing.isStalled ||
    (new Date().getTime() - state.playing.lastTimeUpdate > 2000)
  if (!isProbablyStalled) return

  const prog = state.getPlayingTorrentSummary().progress || {}
  let fileProgress = 0
  if (prog.files) {
    const file = prog.files[state.playing.fileIndex]
    fileProgress = Math.floor(100 * file.numPiecesPresent / file.numPieces)
  }

  return (
    <div key='loading' className='media-stalled'>
      <div key='loading-spinner' className='loading-spinner' />
      <div key='loading-progress' className='loading-status ellipsis'>
        <span><span className='progress'>{fileProgress}%</span> downloaded</span>
        <span> ↓ {prettyBytes(prog.downloadSpeed || 0)}/s</span>
        <span> ↑ {prettyBytes(prog.uploadSpeed || 0)}/s</span>
      </div>
    </div>
  )
}

function renderCastScreen (state) {
  let castIcon, castType, isCast
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
  } else if (state.playing.location === 'external') {
    castIcon = 'tv'
    castType = state.getExternalPlayerName()
    isCast = false
  } else if (state.playing.location === 'error') {
    castIcon = 'error_outline'
    castType = 'Unable to Play'
    isCast = false
  }

  const isStarting = state.playing.location.endsWith('-pending')
  const castName = state.playing.castName
  let castStatus
  if (isCast && isStarting) castStatus = 'Connecting to ' + castName + '...'
  else if (isCast && !isStarting) castStatus = 'Connected to ' + castName
  else castStatus = ''

  // Show a nice title image, if possible
  const style = {
    backgroundImage: cssBackgroundImagePoster(state)
  }

  return (
    <div key='cast' className='letterbox' style={style}>
      <div className='cast-screen'>
        <i className='icon'>{castIcon}</i>
        <div key='type' className='cast-type'>{castType}</div>
        <div key='status' className='cast-status'>{castStatus}</div>
      </div>
    </div>
  )
}

function renderCastOptions (state) {
  if (!state.devices.castMenu) return

  const { location, devices } = state.devices.castMenu
  const player = state.devices[location]

  const items = devices.map(function (device, ix) {
    const isSelected = player.device === device
    const name = device.name
    return (
      <li key={ix} onClick={dispatcher('selectCastDevice', ix)}>
        <i className='icon'>{isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}</i>
        {' '}
        {name}
      </li>
    )
  })

  return (
    <ul key='cast-options' className='options-list'>
      {items}
    </ul>
  )
}

function renderSubtitleOptions (state) {
  const subtitles = state.playing.subtitles
  if (!subtitles.tracks.length || !subtitles.showMenu) return

  const items = subtitles.tracks.map(function (track, ix) {
    const isSelected = state.playing.subtitles.selectedIndex === ix
    return (
      <li key={ix} onClick={dispatcher('selectSubtitle', ix)}>
        <i className='icon'>{'radio_button_' + (isSelected ? 'checked' : 'unchecked')}</i>
        {track.label}
      </li>
    )
  })

  const noneSelected = state.playing.subtitles.selectedIndex === -1
  const noneClass = 'radio_button_' + (noneSelected ? 'checked' : 'unchecked')
  return (
    <ul key='subtitle-options' className='options-list'>
      {items}
      <li onClick={dispatcher('selectSubtitle', -1)}>
        <i className='icon'>{noneClass}</i>
        None
      </li>
    </ul>
  )
}

function renderAudioTrackOptions (state) {
  const audioTracks = state.playing.audioTracks
  if (!audioTracks.tracks.length || !audioTracks.showMenu) return

  const items = audioTracks.tracks.map(function (track, ix) {
    const isSelected = state.playing.audioTracks.selectedIndex === ix
    return (
      <li key={ix} onClick={dispatcher('selectAudioTrack', ix)}>
        <i className='icon'>{'radio_button_' + (isSelected ? 'checked' : 'unchecked')}</i>
        {track.label}
      </li>
    )
  })

  return (
    <ul key='audio-track-options' className='options-list'>
      {items}
    </ul>
  )
}

function renderPlayerControls (state) {
  const positionPercent = 100 * state.playing.currentTime / state.playing.duration
  const playbackCursorStyle = { left: 'calc(' + positionPercent + '% - 3px)' }
  const captionsClass = state.playing.subtitles.tracks.length === 0
    ? 'disabled'
    : state.playing.subtitles.selectedIndex >= 0
      ? 'active'
      : ''
  const multiAudioClass = state.playing.audioTracks.tracks.length > 1
    ? 'active'
    : 'disabled'
  const prevClass = Playlist.hasPrevious(state) ? '' : 'disabled'
  const nextClass = Playlist.hasNext(state) ? '' : 'disabled'

  const elements = [
    <div key='playback-bar' className='playback-bar'>
      {renderLoadingBar(state)}
      <div
        key='cursor'
        className='playback-cursor'
        style={playbackCursorStyle}
      />
      <div
        key='scrub-bar'
        className='scrub-bar'
        draggable
        onDragStart={handleDragStart}
        onClick={handleScrub}
        onDrag={handleScrub}
      />
    </div>,

    <i
      key='skip-previous'
      className={'icon skip-previous float-left ' + prevClass}
      onClick={dispatcher('previousTrack')}
    >
      skip_previous
    </i>,

    <i
      key='play'
      className='icon play-pause float-left'
      onClick={dispatcher('playPause')}
    >
      {state.playing.isPaused ? 'play_arrow' : 'pause'}
    </i>,

    <i
      key='skip-next'
      className={'icon skip-next float-left ' + nextClass}
      onClick={dispatcher('nextTrack')}
    >
      skip_next
    </i>,

    <i
      key='fullscreen'
      className='icon fullscreen float-right'
      onClick={dispatcher('toggleFullScreen')}
    >
      {state.window.isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
    </i>
  ]

  if (state.playing.type === 'video') {
    // Show closed captions icon
    elements.push((
      <i
        key='subtitles'
        className={'icon closed-caption float-right ' + captionsClass}
        onClick={handleSubtitles}
      >
        closed_caption
      </i>
    ), (
      <i
        key='audio-tracks'
        className={'icon multi-audio float-right ' + multiAudioClass}
        onClick={handleAudioTracks}
      >
        library_music
      </i>
    ))
  }

  // If we've detected a Chromecast or AppleTV, the user can play video there
  const castTypes = ['chromecast', 'airplay', 'dlna']
  const isCastingAnywhere = castTypes.some(
    (castType) => state.playing.location.startsWith(castType))

  // Add the cast buttons. Icons for each cast type, connected/disconnected:
  const buttonIcons = {
    chromecast: { true: 'cast_connected', false: 'cast' },
    airplay: { true: 'airplay', false: 'airplay' },
    dlna: { true: 'tv', false: 'tv' }
  }
  castTypes.forEach(function (castType) {
    // Do we show this button (eg. the Chromecast button) at all?
    const isCasting = state.playing.location.startsWith(castType)
    const player = state.devices[castType]
    if ((!player || player.getDevices().length === 0) && !isCasting) return

    // Show the button. Three options for eg the Chromecast button:
    let buttonClass, buttonHandler
    if (isCasting) {
      // Option 1: we are currently connected to Chromecast. Button stops the cast.
      buttonClass = 'active'
      buttonHandler = dispatcher('stopCasting')
    } else if (isCastingAnywhere) {
      // Option 2: we are currently connected somewhere else. Button disabled.
      buttonClass = 'disabled'
      buttonHandler = undefined
    } else {
      // Option 3: we are not connected anywhere. Button opens Chromecast menu.
      buttonClass = ''
      buttonHandler = dispatcher('toggleCastMenu', castType)
    }
    const buttonIcon = buttonIcons[castType][isCasting]

    elements.push((
      <i
        key={castType}
        className={'icon device float-right ' + buttonClass}
        onClick={buttonHandler}
      >
        {buttonIcon}
      </i>
    ))
  })

  // Render volume slider
  const volume = state.playing.volume
  const volumeIcon = 'volume_' + (
    volume === 0 ? 'off'
      : volume < 0.3 ? 'mute'
        : volume < 0.6 ? 'down'
          : 'up')
  const volumeStyle = {
    background: '-webkit-gradient(linear, left top, right top, ' +
      'color-stop(' + (volume * 100) + '%, #eee), ' +
      'color-stop(' + (volume * 100) + '%, #727272))'
  }

  elements.push((
    <div key='volume' className='volume float-left'>
      <i
        className='icon volume-icon float-left'
        onMouseDown={handleVolumeMute}
      >
        {volumeIcon}
      </i>
      <input
        className='volume-slider float-right'
        type='range' min='0' max='1' step='0.05'
        value={volume}
        onChange={handleVolumeScrub}
        style={volumeStyle}
      />
    </div>
  ))

  // Show video playback progress
  const currentTimeStr = formatTime(state.playing.currentTime, state.playing.duration)
  const durationStr = formatTime(state.playing.duration, state.playing.duration)
  elements.push((
    <span key='time' className='time float-left'>
      {currentTimeStr} / {durationStr}
    </span>
  ))

  // Render playback rate
  if (state.playing.playbackRate !== 1) {
    elements.push((
      <span key='rate' className='rate float-left'>
        {state.playing.playbackRate}x
      </span>
    ))
  }

  return (
    <div
      key='controls' className='controls'
      onMouseEnter={dispatcher('mediaControlsMouseEnter')}
      onMouseLeave={dispatcher('mediaControlsMouseLeave')}
    >
      {elements}
      {renderCastOptions(state)}
      {renderSubtitleOptions(state)}
      {renderAudioTrackOptions(state)}
    </div>
  )

  function handleDragStart (e) {
    // Prevent the cursor from changing, eg to a green + icon on Mac
    if (e.dataTransfer) {
      const dt = e.dataTransfer
      dt.effectAllowed = 'none'
    }
  }

  // Handles a click or drag to scrub (jump to another position in the video)
  function handleScrub (e) {
    if (!e.clientX) return
    dispatch('mediaMouseMoved')
    const windowWidth = document.querySelector('body').clientWidth
    const fraction = e.clientX / windowWidth
    const position = fraction * state.playing.duration /* seconds */
    dispatch('skipTo', position)
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
    dispatch('setVolume', e.target.value)
  }

  function handleSubtitles (e) {
    if (!state.playing.subtitles.tracks.length || e.ctrlKey || e.metaKey) {
      // if no subtitles available select it
      dispatch('openSubtitles')
    } else {
      dispatch('toggleSubtitlesMenu')
    }
  }

  function handleAudioTracks (e) {
    dispatch('toggleAudioTracksMenu')
  }
}

// Renders the loading bar. Shows which parts of the torrent are loaded, which
// can be 'spongey' / non-contiguous
function renderLoadingBar (state) {
  if (config.IS_TEST) return // Don't integration test the loading bar. Screenshots won't match.

  const torrentSummary = state.getPlayingTorrentSummary()
  if (!torrentSummary.progress) {
    return null
  }

  // Find all contiguous parts of the torrent which are loaded
  const prog = torrentSummary.progress
  const fileProg = prog.files[state.playing.fileIndex]

  if (!fileProg) return null

  const parts = []
  let lastPiecePresent = false
  for (let i = fileProg.startPiece; i <= fileProg.endPiece; i++) {
    const partPresent = Bitfield.prototype.get.call(prog.bitfield, i)
    if (partPresent && !lastPiecePresent) {
      parts.push({ start: i - fileProg.startPiece, count: 1 })
    } else if (partPresent) {
      parts[parts.length - 1].count++
    }
    lastPiecePresent = partPresent
  }

  // Output some bars to show which parts of the file are loaded
  const loadingBarElems = parts.map(function (part, i) {
    const style = {
      left: (100 * part.start / fileProg.numPieces) + '%',
      width: (100 * part.count / fileProg.numPieces) + '%'
    }

    return (<div key={i} className='loading-bar-part' style={style} />)
  })

  return (<div key='loading-bar' className='loading-bar'>{loadingBarElems}</div>)
}

// Returns the CSS background-image string for a poster image + dark vignette
function cssBackgroundImagePoster (state) {
  const torrentSummary = state.getPlayingTorrentSummary()
  const posterPath = TorrentSummary.getPosterPath(torrentSummary)
  if (!posterPath) return ''
  return cssBackgroundImageDarkGradient() + `, url('${posterPath}')`
}

function cssBackgroundImageDarkGradient () {
  return 'radial-gradient(circle at center, ' +
    'rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 100%)'
}

function formatTime (time, total) {
  if (typeof time !== 'number' || Number.isNaN(time)) {
    return '0:00'
  }

  const totalHours = Math.floor(total / 3600)
  const totalMinutes = Math.floor(total / 60)
  const hours = Math.floor(time / 3600)
  let minutes = Math.floor(time % 3600 / 60)
  if (totalMinutes > 9 && minutes < 10) {
    minutes = '0' + minutes
  }
  const seconds = `0${Math.floor(time % 60)}`.slice(-2)

  return (totalHours > 0 ? hours + ':' : '') + minutes + ':' + seconds
}
