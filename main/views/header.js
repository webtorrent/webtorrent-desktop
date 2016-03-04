module.exports = Header

var h = require('virtual-dom/h')

function Header (state, dispatch) {
  return h('.header', [
    h('.title', state.view.title),
    h('.nav.left', [
      h('i.icon.back', {
        onclick: onBack
      }, 'chevron_left'),
      h('i.icon.forward', {
        onclick: onForward
      }, 'chevron_right')
    ]),
    (function () {
      if (state.url !== '/player') {
        return h('.nav.right', [
          h('i.icon.add', {
            onclick: onAddTorrent
          }, 'add')
        ])
      }
    })()
  ])

  function onBack (e) {
    dispatch('back')
  }

  function onForward (e) {
    dispatch('forward')
  }

  function onAddTorrent (e) {
    var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4'
    dispatch('addTorrent', torrentId)
  }
}
