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
      <div class='torrent-placeholder'>
        <span class='ellipsis'>Drop a torrent file here or paste a magnet link</span>
      </div>
    </div>`
}

// Renders a torrent in the torrent list
// Includes name, download status, play button, background image
// May be expanded for additional info, including the list of files inside
function renderTorrent (torrentSummary, state, dispatch) {
  // Get ephemeral data (like progress %) directly from the WebTorrent handle
  var infoHash = torrentSummary.infoHash
  var torrent = state.client.torrents.find((x) => x.infoHash === infoHash)
  var isSelected = state.selectedInfoHash === infoHash

  // Background image: show some nice visuals, like a frame from the movie, if possible
  var style = {}
  if (torrentSummary.posterURL) {
    var gradient = isSelected
      ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%)'
      : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%)'
    style['background-image'] = gradient + `, url('${torrentSummary.posterURL}')`
  }

  // Foreground: name of the torrent, basic info like size, play button,
  // cast buttons if available, and delete
  var classes = ['torrent']
  //  playStatus turns the play button into a loading spinner or error icon
  if (torrent && torrent.playStatus) classes.push(torrent.playStatus)
  if (isSelected) classes.push('selected')
  classes = classes.join(' ')
  return hx`
    <div style=${style} class=${classes} onclick=${() => dispatch('toggleSelectTorrent', infoHash)}>
      ${renderTorrentMetadata(torrent, torrentSummary)}
      ${renderTorrentButtons(torrentSummary, dispatch)}
      ${isSelected ? renderTorrentDetails(torrent, torrentSummary) : ''}
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
    <div class='buttons'>
      <i.btn.icon.download
        class='${torrentSummary.status}'
        onclick=${(e) => handleButton('toggleTorrent', e)}>
        ${torrentSummary.status === 'seeding' ? 'file_upload' : 'file_download'}
      </i>
      <i.btn.icon.play
        onclick=${(e) => handleButton('openPlayer', e)}>
        ${torrentSummary.playStatus === 'timeout' ? 'warning' : 'play_arrow'}
      </i>
      <i
        class='icon delete'
        onclick=${(e) => handleButton('deleteTorrent', e)}>
        close
      </i>
    </div>
  `

  function handleButton (action, e) {
    // Prevent propagation so that we don't select/unselect the torrent
    e.stopPropagation()
    dispatch(action, torrentSummary)
  }
}

// Show files, per-file download status and play buttons, and so on
function renderTorrentDetails (torrent, torrentSummary) {
  var filesElement
  if (!torrent || !torrent.files) {
    // We don't know what files this torrent contains
    var message = torrent
      ? 'Downloading torrent data using magnet link...'
      : 'Failed to download torrent data from magnet link. Click the download button to try again...'
    filesElement = hx`<div class='files warning'>${message}</div>`
  } else {
    // We do know the files. List them and show download stats for each one
    var fileRows = torrent.files.map(function (file) {
      var numPieces = 0
      for (var piece = file._startPiece; piece < file._endPiece; piece++) {
        if (torrent.bitfield.get(piece)) numPieces++
      }
      var progress = Math.round(100 * numPieces / (file._endPiece - file._startPiece)) + '%'
      return hx`
        <tr>
          <td class='col-name'>${file.name}</td>
          <td class='col-progress'>${progress}</td>
          <td class='col-size'>${prettyBytes(file.length)}</td>
        </li>
      `
    })
    filesElement = hx`
      <div class='files'>
        <strong>Files</strong>
        <table>
          ${fileRows}
        </table>
      </div>
    `
  }

  return hx`
    <div class='torrent-details'>
      ${filesElement}
    </div>
  `
}
