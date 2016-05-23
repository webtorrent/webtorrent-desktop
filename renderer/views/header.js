module.exports = Header

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

var {dispatcher} = require('../lib/dispatcher')

function Header (state) {
  return hx`
    <div class='header'>
      ${getTitle()}
      <div class='nav left'>
        <i.icon.back
          class=${state.location.hasBack() ? '' : 'disabled'}
          title='Back'
          onclick=${dispatcher('back')}>
          chevron_left
        </i>
        <i.icon.forward
          class=${state.location.hasForward() ? '' : 'disabled'}
          title='Forward'
          onclick=${dispatcher('forward')}>
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
      return hx`<div class='title ellipsis'>${state.window.title}</div>`
    }
  }

  function getAddButton () {
    if (state.location.url() !== 'player') {
      return hx`
        <i
          class='icon add'
          title='Add torrent'
          onclick=${dispatcher('showOpenTorrentFile')}>
          add
        </i>
      `
    }
  }
}
