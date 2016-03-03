module.exports = Player

var h = require('virtual-dom/h')

function Player (state, dispatch) {
  return h('.player', [
    h('video', {
      src: state.server.localURL,
      autoplay: true,
      controls: true,
      onloadedmetadata: onLoadedMetadata
    })
  ])

  function onLoadedMetadata (e) {
    var video = e.target
    var dimensions = {
      width: video.videoWidth,
      height: video.videoHeight
    }
    dispatch('setDimensions', dimensions)
  }
}

