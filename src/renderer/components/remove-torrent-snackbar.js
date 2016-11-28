const React = require('react')

const Snackbar = require('material-ui/Snackbar').default

const {dispatch} = require('../lib/dispatcher')

module.exports = class RemoveTorrentSnackbar extends React.Component {
  render () {
    const state = this.props.state
    const message = state.snackbar.deleteData
      ? 'Torrent and data file removed'
      : 'Torrent removed'

    dispatch('deleteTorrent', state.snackbar.infoHash, false)
    let open = true
    return (
      <Snackbar
        action={message}
        onActionTouchTap={handleUndo}
        onRequestClose={handleRemove}
        autoHideDuration={4000}
        open={open} />
    )

    function handleUndo () {
      dispatch('addTorrent', state.snackbar.infoHash)
    }

    function handleRemove () {
      dispatch('deleteTorrent', state.snackbar.infoHash, state.snackbar.deleteData)
    }
  }
}
