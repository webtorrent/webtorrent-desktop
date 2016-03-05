module.exports = Header

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

function Header (state, dispatch) {
  var navLeftStyle = process.platform === 'darwin'
    ? {marginLeft: '78px'} /* OSX needs room on the left for min/max/close buttons */
    : null /* On Windows and Linux, the header is separate & underneath the title bar */
  return hx`
    <div class="header">
      ${getTitle()}
      <div class="nav left" style=${navLeftStyle}>
        <i class="icon back" onclick=${onBack}>chevron_left</i>
        <i class="icon forward" onclick=${onForward}>chevron_right</i>
      </div>
      <div class="nav right">
        ${plusButton()}
      </div>
    </div>
  `

  function getTitle () {
    if (process.platform === 'darwin') {
      return hx`<div class="title">${state.title}</div>`
    }
  }

  function plusButton () {
    if (state.url !== '/player') {
      return hx`<i class="icon add" onclick=${onAddTorrent}>add</i>`
    }
  }

  function onBack (e) {
    dispatch('back')
  }

  function onForward (e) {
    dispatch('forward')
  }

  function onAddTorrent (e) {
    var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4'
    dispatch('addTorrent', torrentId)
  }
}
