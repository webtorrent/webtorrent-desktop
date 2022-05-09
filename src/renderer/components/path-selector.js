import path from 'path'
import * as colors from 'material-ui/styles/colors'
import remote from '@electron/remote'
import * as React from 'react'
import PropTypes from 'prop-types'
import raisedButton from 'material-ui/RaisedButton'
import textField from 'material-ui/TextField'

const RaisedButton = raisedButton.default
const TextField = textField.default
// Lets you pick a file or directory.
// Uses the system Open File dialog.
// You can't edit the text field directly.
export default class PathSelector extends React.Component {
  static propTypes () {
    return {
      className: PropTypes.string,
      dialog: PropTypes.object,
      id: PropTypes.string,
      onChange: PropTypes.func,
      title: PropTypes.string.isRequired,
      value: PropTypes.string
    }
  }

  constructor (props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick () {
    const opts = Object.assign({
      defaultPath: path.dirname(this.props.value || ''),
      properties: ['openFile', 'openDirectory']
    }, this.props.dialog)

    const filenames = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), opts)
    if (!Array.isArray(filenames)) return
    this.props.onChange && this.props.onChange(filenames[0])
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
      flex: '1'
    }
    const text = this.props.value || ''
    const buttonStyle = {
      marginLeft: 10
    }

    return (
      <div className={this.props.className} style={wrapperStyle}>
        <div className='label' style={labelStyle}>
          {this.props.title}:
        </div>
        <TextField
          className='control' disabled id={id} value={text}
          inputStyle={textareaStyle} style={textFieldStyle}
        />
        <RaisedButton
          className='control' label='Change' onClick={this.handleClick}
          style={buttonStyle}
        />
      </div>
    )
  }
}
