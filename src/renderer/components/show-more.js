const React = require('react')
const PropTypes = require('prop-types')

const Button = require('@material-ui/core/Button').default

class ShowMore extends React.Component {
  static get propTypes () {
    return {
      defaultExpanded: PropTypes.bool,
      hideLabel: PropTypes.string,
      showLabel: PropTypes.string
    }
  }

  static get defaultProps () {
    return {
      hideLabel: 'Hide more...',
      showLabel: 'Show more...'
    }
  }

  constructor (props) {
    super(props)

    this.state = {
      expanded: !!this.props.defaultExpanded
    }

    this.handleClick = this.handleClick.bind(this)
  }

  handleClick () {
    this.setState({
      expanded: !this.state.expanded
    })
  }

  render () {
    const label = this.state.expanded
      ? this.props.hideLabel
      : this.props.showLabel
    return (
      <div className='show-more' style={this.props.style}>
        {this.state.expanded ? this.props.children : null}
        <Button
          className='control'
          onClick={this.handleClick}
          variant='contained'
        >
          {label}
        </Button>
      </div>
    )
  }
}

module.exports = ShowMore
