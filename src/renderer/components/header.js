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
        <div className='nav left float-left'>
          <i
            className={'icon back ' + (loc.hasBack() ? '' : 'disabled')}
            title='Back'
            onClick={dispatcher('back')}>
            chevron_left
          </i>
          <i
            className={'icon forward ' + (loc.hasForward() ? '' : 'disabled')}
            title='Forward'
            onClick={dispatcher('forward')}>
            chevron_right
          </i>
        </div>
        <div className='nav right float-right'>
          {this.getListButton()}
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

  getListButton () {
    const state = this.props.state 
    if (state.location.url() !== 'home') return null

    const compact = state.compactListView
    if (compact) {
      return (
        <i className='icon view_list'
          title='List'
          onClick={dispatcher('viewList')}
          >
          view_list
        </i>
      )
    }
    else {
      return (
        <i className='icon list'
          title='Compact list'
          onClick={dispatcher('compactViewList')}
          >
          list
        </i>
      )
    }
  }

  getAddButton () {
    const state = this.props.state
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

module.exports = Header
