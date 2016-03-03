module.exports = Player

var h = require('virtual-dom/h')

function Player (state, dispatch) {
  // Unfortunately, play/pause can't be done just by modifying HTML.
  // Instead, grab the DOM node and play/pause it if necessary
  var videoElement = document.querySelector('video')
  if (videoElement !== null &&
      videoElement.paused !== state.video.isPaused) {
    if (state.video.isPaused) {
      videoElement.pause()
    } else {
      videoElement.play()
    }
  }

  return h('.player', [
    h('video', {
      src: state.server.localURL,
      autoplay: true,
      onloadedmetadata: onLoadedMetadata
    }),
    renderPlayerControls(state, dispatch)
  ])

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
  return h('.player-controls', [
    h('.bottom-bar', [
      h('.loading-bar', {
        onclick: () => dispatch('playbackJump')
      }, renderLoadingBar(state)),
      h('.playback-cursor', {
        style: {left: '125px'}
      }),
      h('i.icon.play-pause', {
        onclick: () => dispatch('playPause')
      }, state.video.isPaused ? 'play_arrow' : 'pause')
    ])
  ])
}

// Renders the loading bar. Shows which parts of the torrent are loaded, which
// can be "spongey" / non-contiguous
function renderLoadingBar (state) {
  // TODO: get real data from webtorrent
  return [
    h('.loading-bar-part', {
      style: {left: '10px', width: '50px'}
    }),
    h('.loading-bar-part', {
      style: {left: '90px', width: '40px'}
    }),
    h('.loading-bar-part', {
      style: {left: '135px', width: '5px'}
    })
  ]
}
