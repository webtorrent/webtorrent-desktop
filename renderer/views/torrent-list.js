module.exports = TorrentList

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)
var prettyBytes = require('prettier-bytes')

var TorrentSummary = require('../lib/torrent-summary')
var TorrentPlayer = require('../lib/torrent-player')
var {dispatcher} = require('../lib/dispatcher')

function TorrentList (state) {
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
    var isSelected = infoHash && state.selectedInfoHash === infoHash

    // Background image: show some nice visuals, like a frame from the movie, if possible
    var style = {}
    if (torrentSummary.posterFileName) {
      var gradient = isSelected
        ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%)'
        : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%)'
      var posterPath = TorrentSummary.getPosterPath(torrentSummary)
      style.backgroundImage = gradient + `, url('${posterPath}')`
    }

    // Foreground: name of the torrent, basic info like size, play button,
    // cast buttons if available, and delete
    var classes = ['torrent']
    //  playStatus turns the play button into a loading spinner or error icon
    if (torrentSummary.playStatus) classes.push(torrentSummary.playStatus)
    if (isSelected) classes.push('selected')
    if (!infoHash) classes.push('disabled')
    classes = classes.join(' ')
    return hx`
      <div style=${style} class=${classes}
        oncontextmenu=${infoHash && dispatcher('openTorrentContextMenu', infoHash)}
        onclick=${infoHash && dispatcher('toggleSelectTorrent', infoHash)}>
        ${renderTorrentMetadata(torrentSummary)}
        ${infoHash ? renderTorrentButtons(torrentSummary) : ''}
        ${isSelected ? renderTorrentDetails(torrentSummary) : ''}
      </div>
    `
  }

  // Show name, download status, % complete
  function renderTorrentMetadata (torrentSummary) {
    var name = torrentSummary.name || 'Loading torrent...'
    var elements = [hx`
      <div class='name ellipsis'>${name}</div>
    `]

    // If it's downloading/seeding then show progress info
    var prog = torrentSummary.progress
    if (torrentSummary.status !== 'paused' && prog) {
      var progress = Math.floor(100 * prog.progress)
      var downloaded = prettyBytes(prog.downloaded)
      var total = prettyBytes(prog.length || 0)
      if (downloaded !== total) downloaded += ` / ${total}`

      elements.push(hx`
        <div class='ellipsis'>
          ${getFilesLength()}
          <span>${getPeers()}</span>
          <span>↓ ${prettyBytes(prog.downloadSpeed || 0)}/s</span>
          <span>↑ ${prettyBytes(prog.uploadSpeed || 0)}/s</span>
        </div>
      `)
      elements.push(hx`
        <div class='ellipsis'>
          <span class='progress'>${progress}%</span>
          <span>${downloaded}</span>
        </div>
      `)
    }

    return hx`<div class='metadata'>${elements}</div>`

    function getPeers () {
      var count = prog.numPeers === 1 ? 'peer' : 'peers'
      return `${prog.numPeers} ${count}`
    }

    function getFilesLength () {
      if (torrentSummary.files && torrentSummary.files.length > 1) {
        return hx`<span class='files'>${torrentSummary.files.length} files</span>`
      }
    }
  }

  // Download button toggles between torrenting (DL/seed) and paused
  // Play button starts streaming the torrent immediately, unpausing if needed
  function renderTorrentButtons (torrentSummary) {
    var infoHash = torrentSummary.infoHash

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

    // Only show the play button for torrents that contain playable media
    var playButton
    if (TorrentPlayer.isPlayableTorrent(torrentSummary)) {
      playButton = hx`
        <i.button-round.icon.play
          title=${playTooltip}
          class=${playClass}
          onclick=${dispatcher('play', infoHash)}>
          ${playIcon}
        </i>
      `
    }

    return hx`
      <div class='buttons'>
        ${playButton}
        <i.button-round.icon.download
          class=${torrentSummary.status}
          title=${downloadTooltip}
          onclick=${dispatcher('toggleTorrent', infoHash)}>
          ${downloadIcon}
        </i>
        <i
          class='icon delete'
          title='Remove torrent'
          onclick=${dispatcher('deleteTorrent', infoHash)}>
          close
        </i>
      </div>
    `
  }

  // Show files, per-file download status and play buttons, and so on
  function renderTorrentDetails (torrentSummary) {
    var filesElement
    if (!torrentSummary.files) {
      // We don't know what files this torrent contains
      var message = torrentSummary.status === 'paused'
        ? 'Failed to load torrent info. Click the download button to try again...'
        : 'Downloading torrent info...'
      filesElement = hx`<div class='files warning'>${message}</div>`
    } else {
      // We do know the files. List them and show download stats for each one
      var fileRows = torrentSummary.files.map(
        (file, index) => renderFileRow(torrentSummary, file, index))
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

  // Show a single torrentSummary file in the details view for a single torrent
  function renderFileRow (torrentSummary, file, index) {
    // First, find out how much of the file we've downloaded
    var isDone = false
    var progress = ''
    if (torrentSummary.progress && torrentSummary.progress.files) {
      var fileProg = torrentSummary.progress.files[index]
      isDone = fileProg.numPiecesPresent === fileProg.numPieces
      progress = Math.round(100 * fileProg.numPiecesPresent / fileProg.numPieces) + '%'
    }

    // Second, render the file as a table row
    var infoHash = torrentSummary.infoHash
    var icon
    var rowClass = ''
    var handleClick
    if (TorrentPlayer.isPlayable(file)) {
      icon = 'play_arrow' /* playable? add option to play */
      handleClick = dispatcher('play', infoHash, index)
    } else {
      icon = 'description' /* file icon, opens in OS default app */
      rowClass = isDone ? '' : 'disabled'
      handleClick = dispatcher('openFile', infoHash, index)
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
  }
}
