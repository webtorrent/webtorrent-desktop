module.exports = App

var h = require('virtual-dom/h')

function App (state, handler) {
  var torrents = state.torrents

  var list = torrents.map(function (torrent) {
    return h('.torrent', [
      h('.name', torrent.name)
    ])
  })

  return h('.app', [
    h('h1', 'WebTorrent'),
    h('.torrent-list', list),
    h('.add', [
      h('button', {
        onclick: onAddTorrent
      }, 'Add New Torrent')
    ])
  ])

  function onAddTorrent (e) {
    handler('addTorrent', '6a9759bffd5c0af65319979fb7832189f4f3c35d')
  }
}
