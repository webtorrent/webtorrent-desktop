module.exports = TorrentList

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)
var prettyBytes = require('prettier-bytes')

var util = require('../util')

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
    var torrent = state.client
      ? state.client.torrents.find((x) => x.infoHash === infoHash)
      : null
    var isSelected = state.selectedInfoHash === infoHash

    // Background image: show some nice visuals, like a frame from the movie, if possible
    var style = {}
    if (torrentSummary.posterURL) {
      var gradient = isSelected
        ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%)'
        : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%)'
      var posterURL = util.getAbsoluteStaticPath(torrentSummary.posterURL)
      // Work around a Chrome bug (reproduced in vanilla Chrome, not just Electron):
      // Backslashes in URLS in CSS cause bizarre string encoding issues
      var cleanURL = posterURL.replace(/\\/g, '/')
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
      <div style=${style} class=${classes}
        oncontextmenu=${() => dispatch('openTorrentContextMenu', torrentSummary)}
        onclick=${() => dispatch('toggleSelectTorrent', infoHash)}>
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
    var playIcon, playTooltip, playClass
    if (torrentSummary.playStatus === 'unplayable') {
      playIcon = 'play_arrow'
      playClass = 'disabled'
      playTooltip = 'Sorry, WebTorrent can\'t play any of the files in this torrent. ' +
        'View details and click on individual files to open them in another program.'
    } else if (torrentSummary.playStatus === 'timeout') {
      playIcon = 'warning'
      playTooltip = 'Playback timed out. No seeds? No internet? Click to try again.'
    } else {
      playIcon = 'play_arrow'
      playTooltip = 'Start streaming'
    }

    var downloadIcon, downloadTooltip
    if (torrentSummary.status === 'seeding') {
      downloadIcon = 'file_upload'
      downloadTooltip = 'Seeding. Click to stop.'
    } else if (torrentSummary.status === 'downloading') {
      downloadIcon = 'file_download'
      downloadTooltip = 'Torrenting. Click to stop.'
    } else {
      downloadIcon = 'file_download'
      downloadTooltip = 'Click to start torrenting.'
    }

    return hx`
      <div class='buttons'>
        <i.btn.icon.play
          title=${playTooltip}
          class=${playClass}
          onclick=${(e) => handleButton('play', e)}>
          ${playIcon}
        </i>
        <i.btn.icon.download
          class=${torrentSummary.status}
          title=${downloadTooltip}
          onclick=${(e) => handleButton('toggleTorrent', e)}>
          ${downloadIcon}
        </i>
        <i
          class='icon delete'
          title='Remove torrent'
          onclick=${(e) => handleButton('deleteTorrent', e)}>
          close
        </i>
      </div>
    `

    function handleButton (action, e) {
      // Prevent propagation so that we don't select/unselect the torrent
      e.stopPropagation()
      if (e.target.classList.contains('disabled')) return
      dispatch(action, torrentSummary)
    }
  }

  // Show files, per-file download status and play buttons, and so on
  function renderTorrentDetails (torrent, torrentSummary) {
    var filesElement
    if (!torrentSummary.files) {
      // We don't know what files this torrent contains
      var message = torrent
        ? 'Downloading torrent data using magnet link...'
        : 'Failed to download torrent data from magnet link. Click the download button to try again...'
      filesElement = hx`<div class='files warning'>${message}</div>`
    } else {
      // We do know the files. List them and show download stats for each one
      var fileRows = torrentSummary.files.map(
        (file, index) => renderFileRow(torrent, torrentSummary, file, index))
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

  // Show a single torrentSummary file in the details view for a single torrent
  function renderFileRow (torrent, torrentSummary, file, index) {
    // First, find out how much of the file we've downloaded
    var isDone = file.numPiecesPresent === file.numPieces
    var progress = Math.round(100 * file.numPiecesPresent / (file.numPieces || 0)) + '%'

    // Second, render the file as a table row
    var icon
    var rowClass = ''
    if (state.playing.infoHash === torrentSummary.infoHash && state.playing.fileIndex === index) {
      icon = 'pause_arrow' /* playing? add option to pause */
    } else if (TorrentPlayer.isPlayable(file)) {
      icon = 'play_arrow' /* playable? add option to play */
    } else {
      icon = 'description' /* file icon, opens in OS default app */
      rowClass = isDone ? '' : 'disabled'
    }
    return hx`
      <tr onclick=${handleClick} class='${rowClass}'>
        <td class='col-icon'>
          <i class='icon'>${icon}</i>
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
