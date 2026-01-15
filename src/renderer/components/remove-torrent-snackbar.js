const React = require('react')

const Snackbar = require('material-ui/Snackbar').default

const { dispatch } = require('../lib/dispatcher')

module.exports = class RemoveTorrentSnackbar extends React.Component {
  componentDidMount () {
    dispatch('deleteTorrent', this.props.state.snackbar.infoHash)
  }

  render () {
    const state = this.props.state

    return (
      <Snackbar
        message='Torrent removed'
        action='Undo'
        autoHideDuration={5000}
        onActionClick={handleUndo(state.snackbar.magnetURI)}
        onRequestClose={clearSnackbar}
        open
      />
    )

    function handleUndo (magnetURI) {
      return function () {
        dispatch('addTorrent', magnetURI)
        dispatch('clearSnackbar')
      }
    }

    function clearSnackbar () {
      dispatch('clearSnackbar')
    }
  }
}
