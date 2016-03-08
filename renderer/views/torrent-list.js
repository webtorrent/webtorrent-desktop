module.exports = TorrentList

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)
var prettyBytes = require('prettier-bytes')

function TorrentList (state, dispatch) {
  var list = state.saved.torrents.map(
    (torrentSummary) => renderTorrent(torrentSummary, state, dispatch))
  return hx`
    <div class='torrent-list'>
      ${list}
      <div class='drop-target'>
        <p>Drop a torrent file here or paste a magnet link</p>
      </div>
    </div>`
}

// Renders a torrent in the torrent list
// Includes name, download status, play button, background image
// May be expanded for additional info, including the list of files inside
function renderTorrent (torrentSummary, state, dispatch) {
  // Get ephemeral data (like progress %) directly from the WebTorrent handle
  var torrent = state.client.torrents.find((x) => x.infoHash === torrentSummary.infoHash)

  // Background image: show some nice visuals, like a frame from the movie, if possible
  var style = {}
  if (torrentSummary.posterURL) {
    style['background-image'] = 'linear-gradient(to bottom, ' +
      'rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%), ' +
      `url("${torrentSummary.posterURL}")`
  }

  // Foreground: name of the torrent, basic info like size, play button,
  // cast buttons if available, and delete
  return hx`
    <div class='torrent ${torrentSummary.playStatus || ''}' style=${style}>
      ${renderTorrentMetadata(torrent, torrentSummary)}
      ${renderTorrentButtons(torrentSummary, dispatch)}
    </div>
  `
}

// Show name, download status, % complete
function renderTorrentMetadata (torrent, torrentSummary) {
  var name = torrentSummary.displayName || torrentSummary.name || 'Loading torrent...'
  var elements = [hx`
    <div class='name ellipsis'>${name}</div>
  `]

  // If a torrent is paused and we only get the torrentSummary
  // If it's downloading/seeding then we have more information
  if (torrent) {
    var progress = Math.floor(100 * torrent.progress)
    var downloaded = prettyBytes(torrent.downloaded)
    var total = prettyBytes(torrent.length || 0)
    if (downloaded !== total) downloaded += ` / ${total}`

    elements.push(hx`
      <div class='status ellipsis'>
        ${getFilesLength()}
        <span>${getPeers()}</span>
        <span>↓ ${prettyBytes(torrent.downloadSpeed || 0)}/s</span>
        <span>↑ ${prettyBytes(torrent.uploadSpeed || 0)}/s</span>
      </div>
    `)
    elements.push(hx`
      <div class='status2 ellipsis'>
        <span class='progress'>${progress}%</span>
        <span>${downloaded}</span>
      </div>
    `)
  }

  return hx`<div class='metadata'>${elements}</div>`

  function getPeers () {
    var count = torrent.numPeers === 1 ? 'peer' : 'peers'
    return `${torrent.numPeers} ${count}`
  }

  function getFilesLength () {
    if (torrent.ready && torrent.files.length > 1) {
      return hx`<span class='files'>${torrent.files.length} files</span>`
    }
  }
}

// Download button toggles between torrenting (DL/seed) and paused
// Play button starts streaming the torrent immediately, unpausing if needed
function renderTorrentButtons (torrentSummary, dispatch) {
  return hx`
    <div class="buttons">
      <i.btn.icon.download
        class='${torrentSummary.status}'
        onclick=${() => dispatch('toggleTorrent', torrentSummary)}>
        ${torrentSummary.status === 'seeding' ? 'file_upload' : 'file_download'}
      </i>
      <i.btn.icon.play
        onclick=${() => dispatch('openPlayer', torrentSummary)}>
        ${torrentSummary.playStatus === 'timeout' ? 'warning' : 'play_arrow'}
      </i>
      <i
        class='icon delete'
        onclick=${() => dispatch('deleteTorrent', torrentSummary)}>
        close
      </i>
    </div>
  `
}
