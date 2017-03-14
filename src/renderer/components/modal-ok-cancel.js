const React = require('react')
const FlatButton = require('material-ui/FlatButton').default
const RaisedButton = require('material-ui/RaisedButton').default

module.exports = class ModalOKCancel extends React.Component {
  render () {
    const cancelStyle = { marginRight: 10, color: 'black' }
    const {cancelText, onCancel, okText, onOK} = this.props
    return (
      <div className='float-right'>
        <FlatButton
          className='control cancel'
          style={cancelStyle}
          label={cancelText}
          onClick={onCancel} />
        <RaisedButton
          className='control ok'
          primary
          label={okText}
          onClick={onOK}
          autoFocus />
      </div>
    )
  }
}
