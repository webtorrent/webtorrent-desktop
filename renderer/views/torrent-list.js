module.exports = TorrentList

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)
var prettyBytes = require('prettier-bytes')

var TorrentPlayer = require('../lib/torrent-player')

function TorrentList (state, dispatch) {
  var torrentRows = state.saved.torrents.map(
    (torrentSummary) => renderTorrent(torrentSummary))
  return hx`
    <div class='torrent-list'>
      ${torrentRows}
      <div class='torrent-placeholder'>
        <span class='ellipsis'>Drop a torrent file here or paste a magnet link</span>
      </div>
    </div>`

  // Renders a torrent in the torrent list
  // Includes name, download status, play button, background image
  // May be expanded for additional info, including the list of files inside
  function renderTorrent (torrentSummary) {
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
      // Work around a Chrome bug (reproduced in vanilla Chrome, not just Electron):
      // Backslashes in URLS in CSS cause bizarre string encoding issues
      var cleanURL = torrentSummary.posterURL.replace(/\\/g, '/')
      style.backgroundImage = gradient + `, url('${cleanURL}')`
    }

    // Foreground: name of the torrent, basic info like size, play button,
    // cast buttons if available, and delete
    var classes = ['torrent']
    //  playStatus turns the play button into a loading spinner or error icon
    if (torrentSummary.playStatus) classes.push(torrentSummary.playStatus)
    if (isSelected) classes.push('selected')
    classes = classes.join(' ')
    return hx`
      <div style=${style} class=${classes} onclick=${() => dispatch('toggleSelectTorrent', infoHash)}>
        ${renderTorrentMetadata(torrent, torrentSummary)}
        ${renderTorrentButtons(torrentSummary)}
        ${isSelected ? renderTorrentDetails(torrent, torrentSummary) : ''}
      </div>
    `
  }

  // Show name, download status, % complete
  function renderTorrentMetadata (torrent, torrentSummary) {
    var name = torrentSummary.name || 'Loading torrent...'
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
  function renderTorrentButtons (torrentSummary) {
    return hx`
      <div class='buttons'>
        <i.btn.icon.play
          onclick=${(e) => handleButton('play', e)}>
          ${torrentSummary.playStatus === 'timeout' ? 'warning' : 'play_arrow'}
        </i>
        <i.btn.icon.download
          class='${torrentSummary.status}'
          onclick=${(e) => handleButton('toggleTorrent', e)}>
          ${torrentSummary.status === 'seeding' ? 'file_upload' : 'file_download'}
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
      var fileRows = torrent.files.map((file, index) => renderFileRow(torrent, torrentSummary, file, index))
      filesElement = hx`
        <div class='files'>
          <strong>Files</strong>
          <span class='open-folder' onclick=${handleOpenFolder}>Open folder</span>
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

    function handleOpenFolder (e) {
      e.stopPropagation()
      dispatch('openFolder', torrentSummary)
    }
  }

  // Show a single file in the details view for a single torrent
  function renderFileRow (torrent, torrentSummary, file, index) {
    // First, find out how much of the file we've downloaded
    var numPieces = file._endPiece - file._startPiece + 1
    var numPiecesPresent = 0
    for (var piece = file._startPiece; piece <= file._endPiece; piece++) {
      if (torrent.bitfield.get(piece)) numPiecesPresent++
    }
    var progress = Math.round(100 * numPiecesPresent / numPieces) + '%'
    var isDone = numPieces === numPiecesPresent

    // Second, render the file as a table row
    var icon
    var iconClass = ''
    if (state.playing.infoHash === torrent.infoHash && state.playing.fileIndex === index) {
      icon = 'pause_arrow' /* playing? add option to pause */
    } else if (TorrentPlayer.isPlayable(file)) {
      icon = 'play_arrow' /* playable? add option to play */
    } else {
      icon = 'description' /* file icon, opens in OS default app */
      iconClass = isDone ? '' : 'disabled'
    }
    return hx`
      <tr onclick=${handleClick}>
        <td class='col-icon'>
          <i class='icon ${iconClass}'>${icon}</i>
        </td>
        <td class='col-name'>${file.name}</td>
        <td class='col-progress'>${progress}</td>
        <td class='col-size'>${prettyBytes(file.length)}</td>
      </tr>
    `

    // Finally, let the user click on the row to play media or open files
    function handleClick (e) {
      e.stopPropagation()
      if (icon === 'pause_arrow') {
        throw new Error('Unimplemented') // TODO: pause audio
      } else if (icon === 'play_arrow') {
        dispatch('play', torrentSummary, index)
      } else if (isDone) {
        dispatch('openFile', torrentSummary, index)
      }
    }
  }
}
