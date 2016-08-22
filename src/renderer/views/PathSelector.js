const c = require('classnames')
const electron = require('electron')
const React = require('react')

const remote = electron.remote

const Button = require('./Button')
const TextInput = require('./TextInput')

class PathSelector extends React.Component {
  static get propTypes () {
    return {
      className: React.PropTypes.string,
      defaultValue: React.PropTypes.string.isRequired,
      dialog: React.PropTypes.object,
      label: React.PropTypes.string.isRequired,
      onChange: React.PropTypes.func
    }
  }

  constructor (props) {
    super(props)

    this.state = {
      value: props.defaultValue
    }

    this.handleClick = this.handleClick.bind(this)
  }

  handleClick () {
    var opts = Object.assign({
      defaultPath: this.state.value,
      properties: [ 'openFile', 'openDirectory' ],
      title: this.props.label
    }, this.props.dialog)

    remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      opts,
      (filenames) => {
        if (!Array.isArray(filenames)) return
        this.setState({value: filenames[0]})
        this.props.onChange && this.props.onChange(filenames[0])
      }
    )
  }

  render () {
    return (
      <div className={c('PathSelector', this.props.className)}>
        <div className='label'>{this.props.label}:</div>
        <TextInput
          className='input'
          disabled
          value={this.state.value}
        />
        <Button
          className='button'
          theme='dark'
          onClick={this.handleClick}
        >
          Change…
        </Button>
      </div>
    )
  }
}

module.exports = PathSelector
