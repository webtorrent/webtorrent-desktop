const c = require('classnames')
const React = require('react')

class Button extends React.Component {
  static get propTypes () {
    return {
      className: React.PropTypes.string,
      onClick: React.PropTypes.func,
      theme: React.PropTypes.oneOf(['light', 'dark']),
      type: React.PropTypes.oneOf(['default', 'flat', 'raised'])
    }
  }

  static get defaultProps () {
    return {
      theme: 'light',
      type: 'default'
    }
  }

  render () {
    const { theme, type, className, ...other } = this.props
    return (
      <button
        {...other}
        className={c(
          'Button',
          theme,
          type,
          className
        )}
        onClick={this.props.onClick}
      >
        {this.props.children}
      </button>
    )
  }
}

module.exports = Button
