module.exports = Header

var h = require('virtual-dom/h')
var hyperx = require('hyperx')
var hx = hyperx(h)

function Header (state, dispatch) {
  return hx`
    <div class='header'>
      ${getTitle()}
      <div class='nav left'>
        <i
          class='icon back'
          title='back'
          onclick=${() => dispatch('back')}>
          chevron_left
        </i>
        <i
          class='icon forward'
          title='forward'
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
          title='add torrent'
          onclick=${() => dispatch('addTorrent')}>
          add
        </i>
      `
    }
  }
}
