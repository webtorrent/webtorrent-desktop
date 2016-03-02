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
      h('a.close', {
        onclick: closePlayer
      }, 'Close')
    ])
  } else {
    var list = state.torrents.map(function (torrent) {
      var style = {}
      if (torrent.posterURL) {
        style['background-image'] = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0)), url("' + torrent.posterURL + '")'
      }
      return h('.torrent', {
        style: style
      }, [
        h('.metadata', [
          h('.name.ellipsis', torrent.name || 'Loading torrent...'),
          h('.status', [
            h('span.progress', Math.floor(100 * torrent.progress) + '%'),
            (torrent.ready && torrent.files.length > 1) ? h('span.files', torrent.files.length + ' files') : ''
          ])
        ]),
        h('a.play', {
          className: !torrent.ready ? 'disabled' : '',
          onclick: openPlayer
        }, '▶')
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
