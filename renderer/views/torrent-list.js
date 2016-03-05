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
  return hx`<div className="torrent-list">${list}</div>`
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
      <i
        className="icon delete"
        onclick=${() => dispatch('deleteTorrent', torrent)}>
        close
      </i>
    `,
    hx`
      <i
        className="${!torrent.ready ? 'disabled btn icon play' : 'btn icon play'}"
        onclick=${() => dispatch('openPlayer', torrent)}>
        play_arrow
      </i>
    `
  ]

  if (state.view.chromecast) {
    elements.push(hx`
      <i
        className="${!torrent.ready ? 'disabled btn icon chromecast' : 'btn icon chromecast'}"
        onclick=${() => dispatch('openChromecast', torrent)}>
        cast
      </i>
    `)
  }

  if (state.view.devices.airplay) {
    elements.push(hx`
      <i
        className="${!torrent.ready ? 'disabled btn icon airplay' : 'btn icon airplay'}"
        onclick=${() => dispatch('openAirplay', torrent)}>
        airplay
      </i>
    `)
  }

  return hx`<div className='torrent' style=${style}>${elements}</div>`
}

// Renders the torrent name and download progress
function renderTorrentMetadata (torrent) {
  return hx`
    <div className="metadata">
      <div className="name ellipsis">${torrent.name || 'Loading torrent...'}</div>
      <div className="status">
        <span className="progress">${Math.floor(100 * torrent.progress)}%</span>
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
      return hx`<span className="files">${torrent.files.length} files</span>`
    }
  }
}
