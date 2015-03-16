module.exports = Player

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

// Shows a streaming video player. Standard features + Chromecast + Airplay
function Player (state, dispatch) {
  // Show the video as large as will fit in the window, play immediately
  // If the video is on Chromecast or Airplay, show a title screen instead
  var showVideo = state.playing.location === 'local'
  return hx`
    <div
      class='player'
      onmousemove=${() => dispatch('videoMouseMoved')}>
      ${showVideo ? renderVideo(state, dispatch) : renderCastScreen(state, dispatch)}
      ${renderPlayerControls(state, dispatch)}
    </div>
  `
}

function renderVideo (state, dispatch) {
  // Unfortunately, play/pause can't be done just by modifying HTML.
  // Instead, grab the DOM node and play/pause it if necessary
  var videoElement = document.querySelector('video')
  if (videoElement !== null) {
    if (state.video.isPaused && !videoElement.paused) {
      videoElement.pause()
    } else if (!state.video.isPaused && videoElement.paused) {
      videoElement.play()
    }
    // When the user clicks or drags on the progress bar, jump to that position
    if (state.video.jumpToTime) {
      videoElement.currentTime = state.video.jumpToTime
      state.video.jumpToTime = null
    }
    state.video.currentTime = videoElement.currentTime
    state.video.duration = videoElement.duration
  }

  return hx`
    <div
      class='letterbox'
      onmousemove=${() => dispatch('videoMouseMoved')}>
      <video
        src='${state.server.localURL}'
        ondblclick=${() => dispatch('toggleFullScreen')}
        onloadedmetadata=${onLoadedMetadata}
        onended=${onEnded}
        onplay=${() => dispatch('videoPlaying')}
        onpause=${() => dispatch('videoPaused')}
        autoplay>
      </video>
    </div>
  `

  // As soon as the video loads enough to know the video dimensions, resize the window
  function onLoadedMetadata (e) {
    var video = e.target
    var dimensions = {
      width: video.videoWidth,
      height: video.videoHeight
    }
    dispatch('setDimensions', dimensions)
  }

  // When the video completes, pause the video instead of looping
  function onEnded (e) {
    state.video.isPaused = true
  }
}

function renderCastScreen (state, dispatch) {
  var isChromecast = state.playing.location.startsWith('chromecast')
  var isAirplay = state.playing.location.startsWith('airplay')
  var isStarting = state.playing.location.endsWith('-pending')
  if (!isChromecast && !isAirplay) throw new Error('Unimplemented cast type')

  // Show a nice title image, if possible
  var style = {}
  var infoHash = state.playing.infoHash
  var torrentSummary = state.saved.torrents.find((x) => x.infoHash === infoHash)
  if (torrentSummary && torrentSummary.posterURL) {
    var cleanURL = torrentSummary.posterURL.replace(/\\/g, '/')
    style.backgroundImage = `radial-gradient(circle at center, rgba(0,0,0,0.4) 0%,rgba(0,0,0,1) 100%), url(${cleanURL})`
  }

  // Show whether we're connected to Chromecast / Airplay
  var castStatus = isStarting ? 'Connecting...' : 'Connected'
  return hx`
    <div class='letterbox' style=${style}>
      <div class='cast-screen'>
        <i class='icon'>${isAirplay ? 'airplay' : 'cast'}</i>
        <div class='cast-type'>${isAirplay ? 'AirPlay' : 'Chromecast'}</div>
        <div class='cast-status'>${castStatus}</div>
      </div>
    </div>
  `
}

function renderPlayerControls (state, dispatch) {
  var positionPercent = 100 * state.video.currentTime / state.video.duration
  var playbackCursorStyle = { left: 'calc(' + positionPercent + '% - 8px)' }

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
        onclick=${() => dispatch('toggleFullScreen')}>
        ${state.window.isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
      </i>
    `
  ]

  // If we've detected a Chromecast or AppleTV, the user can play video there
  var isOnChromecast = state.playing.location.startsWith('chromecast')
  var isOnAirplay = state.playing.location.startsWith('airplay')
  var chromecastClass, chromecastHandler, airplayClass, airplayHandler
  if (isOnChromecast) {
    chromecastClass = 'active'
    airplayClass = 'disabled'
    chromecastHandler = () => dispatch('stopCasting')
    airplayHandler = undefined
  } else if (isOnAirplay) {
    chromecastClass = 'disabled'
    airplayClass = 'active'
    chromecastHandler = undefined
    airplayHandler = () => dispatch('stopCasting')
  } else {
    chromecastClass = ''
    airplayClass = ''
    chromecastHandler = () => dispatch('openChromecast')
    airplayHandler = () => dispatch('openAirplay')
  }
  if (state.devices.chromecast || isOnChromecast) {
    elements.push(hx`
      <i.icon.chromecast
        class=${chromecastClass}
        onclick=${chromecastHandler}>
        cast
      </i>
    `)
  }
  if (state.devices.airplay || isOnAirplay) {
    elements.push(hx`
      <i.icon.airplay
        class=${airplayClass}
        onclick=${airplayHandler}>
        airplay
      </i>
    `)
  }

  // On OSX, the back button is in the title bar of the window; see app.js
  // On other platforms, we render one over the video on mouseover
  if (process.platform !== 'darwin') {
    elements.push(hx`
      <i.icon.back
        onclick=${() => dispatch('back')}>
        chevron_left
      </i>
    `)
  }

  // Finally, the big button in the center plays or pauses the video
  elements.push(hx`
    <i class='icon play-pause' onclick=${() => dispatch('playPause')}>
      ${state.video.isPaused ? 'play_arrow' : 'pause'}
    </i>
  `)

  return hx`<div class='player-controls'>${elements}</div>`

  // Handles a click or drag to scrub (jump to another position in the video)
  function handleScrub (e) {
    dispatch('videoMouseMoved')
    var windowWidth = document.querySelector('body').clientWidth
    var fraction = e.clientX / windowWidth
    var position = fraction * state.video.duration /* seconds */
    dispatch('playbackJump', position)
  }
}

// Renders the loading bar. Shows which parts of the torrent are loaded, which
// can be "spongey" / non-contiguous
function renderLoadingBar (state) {
  var torrent = state.client.get(state.playing.infoHash)
  if (torrent === null) {
    return []
  }

  // Find all contiguous parts of the torrent which are loaded
  var parts = []
  var lastPartPresent = false
  var numParts = torrent.pieces.length
  for (var i = 0; i < numParts; i++) {
    var partPresent = torrent.bitfield.get(i)
    if (partPresent && !lastPartPresent) {
      parts.push({start: i, count: 1})
    } else if (partPresent) {
      parts[parts.length - 1].count++
    }
    lastPartPresent = partPresent
  }

  // Output an list of rectangles to show loading progress
  return hx`
    <div class='loading-bar'>
      ${parts.map(function (part) {
        var style = {
          left: (100 * part.start / numParts) + '%',
          width: (100 * part.count / numParts) + '%'
        }

        return hx`<div class='loading-bar-part' style=${style}></div>`
      })}
    </div>
  `
}
