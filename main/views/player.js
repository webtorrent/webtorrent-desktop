module.exports = Player

var h = require('virtual-dom/h')

function Player (state, dispatch) {
  return h('.player', [
    h('video', {
      src: state.server.localURL,
      autoplay: true,
      controls: true
    }),
    h('a.close', {
      onclick: closePlayer
    }, 'Close')
  ])

  function closePlayer () {
    dispatch('closePlayer')
  }
}

