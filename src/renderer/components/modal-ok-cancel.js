import * as React from 'react'
import flatButton from 'material-ui/FlatButton'
import raisedButton from 'material-ui/RaisedButton'

const FlatButton = flatButton.default
const RaisedButton = raisedButton.default
export default class ModalOKCancel extends React.Component {
  render () {
    const cancelStyle = { marginRight: 10, color: 'black' }
    const { cancelText, onCancel, okText, onOK } = this.props
    return (
      <div className='float-right'>
        <FlatButton
          className='control cancel'
          style={cancelStyle}
          label={cancelText}
          onClick={onCancel}
        />
        <RaisedButton
          className='control ok'
          primary
          label={okText}
          onClick={onOK}
          autoFocus
        />
      </div>
    )
  }
}
