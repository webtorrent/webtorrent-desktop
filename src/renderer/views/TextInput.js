const c = require('classnames')
const React = require('react')

class TextInput extends React.Component {
  static get propTypes () {
    return {
      theme: React.PropTypes.oneOf('light', 'dark'),
      className: React.PropTypes.string
    }
  }

  static get defaultProps () {
    return {
      theme: 'light'
    }
  }

  render () {
    const { className, theme, ...other } = this.props
    return (
      <input
        {...other}
        className={c(
          'TextInput',
          theme,
          className
        )}
        type='text'
      />
    )
  }
}

module.exports = TextInput
