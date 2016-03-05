module.exports = Player

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)
var electron = require('electron')

function Player (state, dispatch) {
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

  // Show the video as large as will fit in the window, play immediately
  return hx`
    <div class="player">
      <video
        src="${state.server.localURL}"
        onloadedmetadata="${onLoadedMetadata}"
        autoplay="true">
      </video>
      ${renderPlayerControls(state, dispatch)}
    </div>
  `

  // As soon as the video loads far enough to know the dimensions, resize the
  // window to match the video resolution
  function onLoadedMetadata (e) {
    var video = e.target
    var dimensions = {
      width: video.videoWidth,
      height: video.videoHeight
    }
    dispatch('setDimensions', dimensions)
  }
}

// Renders all video controls: play/pause, scrub, loading bar
// TODO: cast buttons
function renderPlayerControls (state, dispatch) {
  var positionPercent = 100 * state.video.currentTime / state.video.duration
  var playbackCursorStyle = { left: 'calc(' + positionPercent + '% - 6px)' }
  var torrent = state.view.torrentPlaying._torrent

  var elements = [
    hx`
      <div class="playback-bar">
        ${renderLoadingBar(state)}
        <div class="playback-cursor" style=${playbackCursorStyle}></div>
        <div class="scrub-bar"
          draggable="true"
          onclick=${handleScrub},
          ondrag=${handleScrub}></div>
      </div>
    `,
    hx`
      <i class="icon fullscreen"
        onclick=${() => dispatch('toggleFullScreen')}>
        fullscreen
      </i>
    `
  ]
  if (state.view.devices.chromecast) {
    elements.push(hx`
      <i.icon.chromecast
        class="${!torrent.ready ? 'disabled' : ''}"
        onclick=${() => dispatch('openChromecast', torrent)}>
        cast
      </i>
    `)
  }
  if (state.view.devices.airplay) {
    elements.push(hx`
      <i.icon.airplay
        class="${!torrent.ready ? 'disabled' : ''}"
        onclick=${() => dispatch('openAirplay', torrent)}>
        airplay
      </i>
    `)
  }
  elements.push(hx`
    <i class="icon play-pause" onclick=${() => dispatch('playPause')}>
      ${state.video.isPaused ? 'play_arrow' : 'pause'}
    </i>
  `)

  return hx`<div class="player-controls">${elements}</div>`

  // Handles a click or drag to scrub (jump to another position in the video)
  function handleScrub (e) {
    // TODO: don't use remote -- it does IPC with the main process which is overkill
    // just to get the width
    var windowWidth = electron.remote.getCurrentWindow().getBounds().width
    var fraction = e.clientX / windowWidth
    var position = fraction * state.video.duration /* seconds */
    dispatch('playbackJump', position)
  }
}

// Renders the loading bar. Shows which parts of the torrent are loaded, which
// can be "spongey" / non-contiguous
function renderLoadingBar (state) {
  var torrent = state.view.torrentPlaying._torrent
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
    <div class="loading-bar">
      ${parts.map(function (part) {
        var style = {
          left: (100 * part.start / numParts) + '%',
          width: (100 * part.count / numParts) + '%'
        }

        return hx`<div class="loading-bar-part" style=${style}></div>`
      })}
    </div>
  `
}
