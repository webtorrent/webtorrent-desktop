module.exports = Header

const React = require('react')

const {dispatcher} = require('../lib/dispatcher')

function Header (state) {
  return (
    <div className='header'>
      {getTitle()}
      <div className='nav left float-left'>
        <i
          className={'icon back ' + (state.location.hasBack() ? '' : 'disabled')}
          title='Back'
          onClick={dispatcher('back')}>
          chevron_left
        </i>
        <i
          className={'icon forward ' + (state.location.hasForward() ? '' : 'disabled')}
          title='Forward'
          onClick={dispatcher('forward')}>
          chevron_right
        </i>
      </div>
      <div className='nav right float-right'>
        {getAddButton()}
      </div>
    </div>
  )

  function getTitle () {
    if (process.platform !== 'darwin') return null
    return (<div className='title ellipsis'>{state.window.title}</div>)
  }

  function getAddButton () {
    if (state.location.url() !== 'home') return null
    return (
      <i
        className='icon add'
        title='Add torrent'
        onClick={dispatcher('openFiles')}>
        add
      </i>
    )
  }
}
