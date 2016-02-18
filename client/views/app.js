module.exports = App

var h = require('virtual-dom/h')

function App (state) {
  var count = state.count
  return h('div', {
    style: {
      textAlign: 'center',
      lineHeight: (100 + count) + 'px',
      border: '1px solid red',
      width: (100 + count) + 'px',
      height: (100 + count) + 'px'
    }
  }, [ String(count) ])
}
