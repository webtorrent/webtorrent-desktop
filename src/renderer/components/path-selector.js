const colors = require('material-ui/styles/colors')
const electron = require('electron')
const React = require('react')

const remote = electron.remote

const RaisedButton = require('material-ui/RaisedButton').default
const TextField = require('material-ui/TextField').default

// Lets you pick a file or directory.
// Uses the system Open File dialog.
// You can't edit the text field directly.
class PathSelector extends React.Component {
  static get propTypes () {
    return {
      className: React.PropTypes.string,
      dialog: React.PropTypes.object,
      displayValue: React.PropTypes.string,
      id: React.PropTypes.string,
      onChange: React.PropTypes.func,
      title: React.PropTypes.string.isRequired,
      value: React.PropTypes.string
    }
  }

  constructor (props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick () {
    var opts = Object.assign({
      defaultPath: this.props.value,
      properties: [ 'openFile', 'openDirectory' ]
    }, this.props.dialog)

    remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      opts,
      (filenames) => {
        if (!Array.isArray(filenames)) return
        this.props.onChange && this.props.onChange(filenames[0])
      }
    )
  }

  render () {
    const id = this.props.title.replace(' ', '-').toLowerCase()
    const wrapperStyle = {
      alignItems: 'center',
      display: 'flex',
      width: '100%'
    }
    const labelStyle = {
      flex: '0 auto',
      marginRight: 10,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
    const textareaStyle = {
      color: colors.grey50
    }
    const textFieldStyle = {
      flex: '1',
      fontSize: 14
    }
    const text = this.props.displayValue || this.props.value
    const buttonStyle = {
      marginLeft: 10
    }

    return (
      <div className={this.props.className} style={wrapperStyle}>
        <div className='label' style={labelStyle}>
          {this.props.title}:
        </div>
        <TextField className='control' disabled id={id} value={text}
          inputStyle={textareaStyle} style={textFieldStyle} />
        <RaisedButton className='control' label='Change' onClick={this.handleClick}
          style={buttonStyle} />
      </div>
    )
  }
}

module.exports = PathSelector
