module.exports = TorrentList

var prettyBytes = require('prettier-bytes')

var hx = require('../lib/hx')
var TorrentSummary = require('../lib/torrent-summary')
var TorrentPlayer = require('../lib/torrent-player')
var {dispatcher} = require('../lib/dispatcher')

function TorrentList (state) {
  var torrentRows = state.saved.torrents.map(
    (torrentSummary) => renderTorrent(torrentSummary)
  )

  return hx`
    <div class='torrent-list'>
      ${torrentRows}
      <div class='torrent-placeholder'>
        <span class='ellipsis'>Drop a torrent file here or paste a magnet link</span>
      </div>
    </div>`

  function renderTorrent (torrentSummary) {
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
      elements.push(hx`
        <div class='ellipsis'>
          ${renderPercentProgress()}
          ${renderTotalProgress()}
          ${renderPeers()}
          ${renderDownloadSpeed()}
          ${renderUploadSpeed()}
        </div>
      `)
    }

    return hx`<div class='metadata'>${elements}</div>`

    function renderPercentProgress () {
      var progress = Math.floor(100 * prog.progress)
      return hx`<span>${progress}%</span>`
    }

    function renderTotalProgress () {
      var downloaded = prettyBytes(prog.downloaded)
      var total = prettyBytes(prog.length || 0)
      if (downloaded === total) {
        return hx`<span>${downloaded}</span>`
      } else {
        return hx`<span>${downloaded} / ${total}</span>`
      }
    }

    function renderPeers () {
      if (prog.numPeers === 0) return
      var count = prog.numPeers === 1 ? 'peer' : 'peers'
      return hx`<span>${prog.numPeers} ${count}</span>`
    }

    function renderDownloadSpeed () {
      if (prog.downloadSpeed === 0) return
      return hx`<span>↓ ${prettyBytes(prog.downloadSpeed)}/s</span>`
    }

    function renderUploadSpeed () {
      if (prog.uploadSpeed === 0) return
      return hx`<span>↑ ${prettyBytes(prog.uploadSpeed)}/s</span>`
    }
  }

  // Download button toggles between torrenting (DL/seed) and paused
  // Play button starts streaming the torrent immediately, unpausing if needed
  function renderTorrentButtons (torrentSummary) {
    var infoHash = torrentSummary.infoHash

    var playIcon, playTooltip, playClass
    if (torrentSummary.playStatus === 'timeout') {
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

    // Do we have a saved position? Show it using a radial progress bar on top
    // of the play button, unless already showing a spinner there:
    var positionElem
    var willShowSpinner = torrentSummary.playStatus === 'requested'
    var defaultFile = torrentSummary.files &&
      torrentSummary.files[torrentSummary.defaultPlayFileIndex]
    if (defaultFile && defaultFile.currentTime && !willShowSpinner) {
      var fraction = defaultFile.currentTime / defaultFile.duration
      positionElem = renderRadialProgressBar(fraction, 'radial-progress-large')
      playClass = 'resume-position'
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
        ${positionElem}
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
      var fileRows = torrentSummary.files
        .map((file, index) => ({ file, index }))
        .sort(function (a, b) {
          if (a.file.name < b.file.name) return -1
          if (b.file.name < a.file.name) return 1
          return 0
        })
        .map((object) => renderFileRow(torrentSummary, object.file, object.index))

      filesElement = hx`
        <div class='files'>
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
    var isSelected = torrentSummary.selections[index] // Are we even torrenting it?
    var isDone = false // Are we finished torrenting it?
    var progress = ''
    if (torrentSummary.progress && torrentSummary.progress.files) {
      var fileProg = torrentSummary.progress.files[index]
      isDone = fileProg.numPiecesPresent === fileProg.numPieces
      progress = Math.round(100 * fileProg.numPiecesPresent / fileProg.numPieces) + '%'
    }

    // Second, for media files where we saved our position, show how far we got
    var positionElem
    if (file.currentTime) {
      // Radial progress bar. 0% = start from 0:00, 270% = 3/4 of the way thru
      positionElem = renderRadialProgressBar(file.currentTime / file.duration)
    }

    // Finally, render the file as a table row
    var isPlayable = TorrentPlayer.isPlayable(file)
    var infoHash = torrentSummary.infoHash
    var icon
    var handleClick
    if (isPlayable) {
      icon = 'play_arrow' /* playable? add option to play */
      handleClick = dispatcher('play', infoHash, index)
    } else {
      icon = 'description' /* file icon, opens in OS default app */
      handleClick = dispatcher('openItem', infoHash, index)
    }
    var rowClass = ''
    if (!isSelected) rowClass = 'disabled' // File deselected, not being torrented
    if (!isDone && !isPlayable) rowClass = 'disabled' // Can't open yet, can't stream
    return hx`
      <tr onclick=${handleClick}>
        <td class='col-icon ${rowClass}'>
          ${positionElem}
          <i class='icon'>${icon}</i>
        </td>
        <td class='col-name ${rowClass}'>
          ${file.name}
        </td>
        <td class='col-progress ${rowClass}'>
          ${isSelected ? progress : ''}
        </td>
        <td class='col-size ${rowClass}'>
          ${prettyBytes(file.length)}
        </td>
        <td class='col-select'
            onclick=${dispatcher('toggleTorrentFile', infoHash, index)}>
          <i class='icon'>${isSelected ? 'close' : 'add'}</i>
        </td>
      </tr>
    `
  }
}

function renderRadialProgressBar (fraction, cssClass) {
  var rotation = 360 * fraction
  var transformFill = {transform: 'rotate(' + (rotation / 2) + 'deg)'}
  var transformFix = {transform: 'rotate(' + rotation + 'deg)'}

  return hx`
    <div class="radial-progress ${cssClass}">
      <div class="circle">
        <div class="mask full" style=${transformFill}>
          <div class="fill" style=${transformFill}></div>
        </div>
        <div class="mask half">
          <div class="fill" style=${transformFill}></div>
          <div class="fill fix" style=${transformFix}></div>
        </div>
      </div>
      <div class="inset"></div>
    </div>
  `
}
