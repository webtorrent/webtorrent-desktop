module.exports = Header

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

function Header (state, dispatch) {
  var navLeftStyle = process.platform === 'darwin'
    ? {marginLeft: '78px'} /* OSX needs room on the left for min/max/close buttons */
    : null /* On Windows and Linux, the header is separate & underneath the title bar */

  return hx`
    <div class='header'>
      ${getTitle()}
      <div class='nav left' style=${navLeftStyle}>
        <i
          class='icon back'
          onclick=${() => dispatch('back')}>
          chevron_left
        </i>
        <i
          class='icon forward'
          onclick=${() => dispatch('forward')}>
          chevron_right
        </i>
      </div>
      <div class='nav right'>
        ${getAddButton()}
      </div>
    </div>
  `

  function getTitle () {
    if (process.platform === 'darwin') {
      return hx`<div class='title'>${state.title}</div>`
    }
  }

  function getAddButton () {
    if (state.url !== '/player') {
      return hx`
        <i
          class='icon add'
          onclick=${() => dispatch('addTorrent')}>
          add
        </i>
      `
    }
  }
}
