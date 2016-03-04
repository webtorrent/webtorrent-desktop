module.exports = TorrentList

var h = require('virtual-dom/h')
var prettyBytes = require('pretty-bytes')

function TorrentList (state, dispatch) {
  var torrents = state.view.client
    ? state.view.client.torrents
    : []

  var list = torrents.map((torrent) => renderTorrent(state, dispatch, torrent))
  return h('.torrent-list', list)
}

// Renders a torrent in the torrent list
// Includes name, download status, play button, background image
// May be expanded for additional info, including the list of files inside
function renderTorrent (state, dispatch, torrent) {
  // Background image: show some nice visuals, like a frame from the movie, if possible
  var style = {}
  if (torrent.posterURL) {
    style['background-image'] = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%), url("' + torrent.posterURL + '")'
  }

  // Foreground: name of the torrent, basic info like size, play button,
  // cast buttons if available, and delete
  var elements = [
    renderTorrentMetadata(torrent),
    h('i.icon.delete', {
      onclick: () => dispatch('deleteTorrent', torrent)
    }, 'close'),
    h('i.btn.icon.play', {
      className: !torrent.ready ? 'disabled' : '',
      onclick: () => dispatch('openPlayer', torrent)
    }, 'play_arrow')
  ]
  if (state.view.chromecast) {
    elements.push(h('i.btn.icon.chromecast', {
      className: !torrent.ready ? 'disabled' : '',
      onclick: () => dispatch('openChromecast', torrent)
    }, 'cast'))
  }
  if (state.view.devices.airplay) {
    elements.push(h('i.btn.icon.airplay', {
      className: !torrent.ready ? 'disabled' : '',
      onclick: () => dispatch('openAirplay', torrent)
    }, 'airplay'))
  }

  return h('.torrent', {style: style}, elements)
}

// Renders the torrent name and download progress
function renderTorrentMetadata (torrent) {
  return h('.metadata', [
    h('.name.ellipsis', torrent.name || 'Loading torrent...'),
    h('.status', [
      h('span.progress', Math.floor(100 * torrent.progress) + '%'),
      (function () {
        if (torrent.ready && torrent.files.length > 1) {
          return h('span.files', torrent.files.length + ' files')
        }
      })(),
      h('span', torrent.numPeers + ' ' + (torrent.numPeers === 1 ? 'peer' : 'peers')),
      h('span', prettyBytes(torrent.downloadSpeed) + '/s'),
      h('span', prettyBytes(torrent.uploadSpeed) + '/s')
    ])
  ])
}
