module.exports = Header

var h = require('virtual-dom/h')

function Header (state, dispatch) {
  return h('.header', [
    h('.title', state.title),
    h('.nav.left-nav', [
      h('a.back.icon-left-open.disabled'),
      h('a.forward.icon-right-open')
    ]),
    h('.nav.right-nav', [
      h('a.add.icon-plus', {
        onclick: onAddTorrent
      })
    ])
  ])

  function onAddTorrent (e) {
    var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4'
    dispatch('addTorrent', torrentId)
  }
}
