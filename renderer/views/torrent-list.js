module.exports = TorrentList

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)
var prettyBytes = require('pretty-bytes')

function TorrentList (state, dispatch) {
  var torrents = state.view.client
    ? state.view.client.torrents
    : []

  var list = torrents.map((torrent) => renderTorrent(state, dispatch, torrent))
  return hx`<div.torrent-list>${list}</div>`
}

// Renders a torrent in the torrent list
// Includes name, download status, play button, background image
// May be expanded for additional info, including the list of files inside
function renderTorrent (state, dispatch, torrent) {
  // Background image: show some nice visuals, like a frame from the movie, if possible
  var style = {}
  if (torrent.posterURL) {
    style['background-image'] = `linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%), url("${torrent.posterURL}")`
  }

  // Foreground: name of the torrent, basic info like size, play button,
  // cast buttons if available, and delete
  var elements = [
    renderTorrentMetadata(torrent),
    hx`
      <i.icon.delete
        onclick=${() => dispatch('deleteTorrent', torrent)}>
        close
      </i>
    `,
    hx`
      <i.btn.icon.play
        className="${!torrent.ready ? 'disabled' : ''}"
        onclick=${() => dispatch('openPlayer', torrent)}>
        play_arrow
      </i>
    `
  ]

  if (state.view.chromecast) {
    elements.push(hx`
      <i.btn.icon.chromecast
        className="${!torrent.ready ? 'disabled' : ''}"
        onclick=${() => dispatch('openChromecast', torrent)}>
        cast
      </i>
    `)
  }

  if (state.view.devices.airplay) {
    elements.push(hx`
      <i.btn.icon.airplay
        className="${!torrent.ready ? 'disabled' : ''}"
        onclick=${() => dispatch('openAirplay', torrent)}>
        airplay
      </i>
    `)
  }

  return hx`<div.torrent style=${style}>${elements}</div>`
}

// Renders the torrent name and download progress
function renderTorrentMetadata (torrent) {
  return hx`
    <div.metadata>
      <div.name.ellipsis>${torrent.name || 'Loading torrent...'}</div>
      <div.status>
        <span.progress>${Math.floor(100 * torrent.progress)}%</span>
      </div>
      ${getFilesLength()}
      <span>${getPeers()}</span>
      <span>${prettyBytes(torrent.downloadSpeed)}/s</span>
      <span>${prettyBytes(torrent.uploadSpeed)}/s</span>
    </div>
  `

  function getPeers () {
    var count = torrent.numPeers === 1 ? 'peer' : 'peers'
    return `${torrent.numPeers} ${count}`
  }

  function getFilesLength () {
    if (torrent.ready && torrent.files.length > 1) {
      return hx`<span.files>${torrent.files.length} files</span>`
    }
  }
}
