const React = require('react')
const {injectIntl} = require('react-intl')

const {dispatcher} = require('../lib/dispatcher')

class Header extends React.Component {
  render () {
    var loc = this.props.state.location
    return (
      <div className='header'>
        {this.getTitle()}
        <div className='nav left float-left'>
          <i
            className={'icon back ' + (loc.hasBack() ? '' : 'disabled')}
            title={this.props.intl.formatMessage({id: 'menu-back', defaultMessage: 'Back'})}
            onClick={dispatcher('back')}>
            chevron_left
          </i>
          <i
            className={'icon forward ' + (loc.hasForward() ? '' : 'disabled')}
            title={this.props.intl.formatMessage({id: 'menu-forward', defaultMessage: 'Forward'})}
            onClick={dispatcher('forward')}>
            chevron_right
          </i>
        </div>
        <div className='nav right float-right'>
          {this.getAddButton()}
        </div>
      </div>
    )
  }

  getTitle () {
    if (process.platform !== 'darwin') return null
    var state = this.props.state
    return (<div className='title ellipsis'>{state.window.title}</div>)
  }

  getAddButton () {
    var state = this.props.state
    if (state.location.url() !== 'home') return null
    return (
      <i
        className='icon add'
        title={this.props.intl.formatMessage({id: 'menu-add-torrent', defaultMessage: 'Add torrent'})}
        onClick={dispatcher('openFiles')}>
        add
      </i>
    )
  }
}

module.exports = injectIntl(Header)
