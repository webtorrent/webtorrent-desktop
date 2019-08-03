const React = require('react')

const { dispatcher } = require('../lib/dispatcher')

class Header extends React.Component {
  render () {
    const loc = this.props.state.location
    return (
      <div className='header'
        onMouseMove={dispatcher('mediaMouseMoved')}
        onMouseEnter={dispatcher('mediaControlsMouseEnter')}
        onMouseLeave={dispatcher('mediaControlsMouseLeave')}>
        {this.getTitle()}
        <div className='nav right float-right'>
          {this.getAddButton()}
        </div>
      </div>
    )
  }

  getTitle () {
    if (process.platform !== 'darwin') return null
    const state = this.props.state
    return (<div className='title ellipsis'>{state.window.title}</div>)
  }

  getAddButton () {
    const state = this.props.state
    if (state.location.url() !== 'home') return null
    return (
      <div onClick={dispatcher('openFiles')}>
        <span>Add torrent or playlist</span>
        <i
          className='icon add'
          title='Add torrent or playlist'>
          add
        </i>
      </div>
      
    )
  }
}

module.exports = Header
