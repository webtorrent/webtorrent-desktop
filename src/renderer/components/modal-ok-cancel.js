const React = require('react')
const Button = require('@material-ui/core/Button').default

module.exports = class ModalOKCancel extends React.Component {
  render () {
    const cancelStyle = { marginRight: 10, color: 'black' }
    const { cancelText, color = 'primary', onCancel, okText, onOK } = this.props
    return (
      <div className='float-right'>
        <Button
          className='control cancel'
          onClick={onCancel}
          style={cancelStyle}
        >
          {cancelText}
        </Button>
        <Button
          autoFocus
          className='control ok'
          onClick={onOK}
          color={color}
          variant='contained'
        >
          {okText}
        </Button>
      </div>
    )
  }
}
