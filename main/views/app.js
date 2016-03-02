module.exports = App

var h = require('virtual-dom/h')

function App (state, handler) {
  if (state.player) {
    return h('.player', [
      h('video', {
        src: state.player.url,
        autoplay: true,
        controls: true
      }),
      h('button.close', {
        onclick: closePlayer
      }, 'Close')
    ])
  } else {
    var list = state.torrents.map(function (torrent) {
      var style = {}
      if (torrent.posterURL) {
        style['background-image'] = 'url("' + torrent.posterURL + '")'
      }
      return h('.torrent', {
        style: style
      }, [
        h('.name', torrent.name),
        h('.progress', String(torrent.progress * 100) + '%'),
        h('button.play', {
          disabled: !torrent.ready,
          onclick: openPlayer
        }, 'Play')
      ])

      function openPlayer () {
        handler('openPlayer', torrent)
      }
    })
    return h('.app', [
      h('.torrent-list', list),
      h('.add', [
        h('button', {
          onclick: onAddTorrent
        }, 'Add New Torrent')
      ])
    ])
  }

  function onAddTorrent (e) {
    var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4'
    handler('addTorrent', torrentId)
  }

  function closePlayer () {
    handler('closePlayer')
  }
}
