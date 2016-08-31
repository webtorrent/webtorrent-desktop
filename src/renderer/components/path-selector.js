const colors = require('material-ui/styles/colors')
const electron = require('electron')
const React = require('react')

const remote = electron.remote

const RaisedButton = require('material-ui/RaisedButton').default
const TextField = require('material-ui/TextField').default

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
    return (
      <div
        className={this.props.className}
        style={{
          alignItems: 'center',
          display: 'flex',
          width: '100%'
        }}
      >
        <div
          className='label'
          style={{
            flex: '0 auto',
            marginRight: 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {this.props.title}:
        </div>
        <TextField
          className='control'
          disabled
          id={id}
          inputStyle={{
            color: colors.grey50
          }}
          style={{
            flex: '1',
            fontSize: 14
          }}
          value={this.props.displayValue || this.props.value}
        />
        <RaisedButton
          className='control'
          label='Change'
          onClick={this.handleClick}
          style={{
            marginLeft: 10
          }}
        />
      </div>
    )
  }
}

module.exports = PathSelector
