const React = require('react')

const colors = require('material-ui/styles/colors')

class PageHeading extends React.Component {
  render () {
    <h2
      style={{
        color: colors.grey100,
        fontSize: 20,
        marginBottom: 15,
        marginTop: 30
      }}
    >{this.props.children}</h2>
  }
}

module.exports = PageHeading
