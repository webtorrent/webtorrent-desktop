const React = require('react')
const { dispatcher } = require('../lib/dispatcher')

//TODO : MOVE THIS FUNCTION TO THE CONTROLLER I DON'T KNOW HOW TO DO IT.
const fs = require('fs')
const config = require('../../config')

function getAllPlaylists() {

    var files = fs.readdirSync(config.PLAYLIST_PATH);

    //We just want json files to avoid rubbish or system files.
    files = files.filter(file => file.endsWith('.json'))

    const playlists = []
    files.forEach(file => {
        file = file.replace('.json', '')
        playlists.push(file);
    });

    this.state.playlistsList = playlists;
    return playlists
  }
// ------

module.exports = class PlaylistList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { playlistName: '' };
    this.handleChange = this.handleChange.bind(this)
  }

  render() {
    const createPlaylist = this.renderCreatePlaylistInput()
    const playlistList = this.renderPlaylistsLists()

    return (
      <div key='playlists'>
        {createPlaylist}
        {playlistList}
      </div>
    )
  }


  renderCreatePlaylistInput() {
    return (
      <div>
        <input
          value={this.state.playlistName}
          onChange={this.handleChange}
          placeholder="playlist's name">
        </input>

        <button
          disabled={!this.state.playlistName}
          onClick={dispatcher('createPlaylist', this.state.playlistName)}>
          Create new playlist
        </button>
      </div>
    )
  }

  renderPlaylistsLists() {
    this.state.allPlaylists = getAllPlaylists();
    const content = []

    this.state.allPlaylists.forEach((id) => {
      content.push(
        <div key={id} onClick={id && dispatcher('setPlaylist', id)}>
          {id}
          <i
            key='delete-playlist-button'
            className='icon delete'
            title='Remove playlist'
            onClick={dispatcher('confirmDeletePlaylist', id, false)}>
            close
          </i>
        </div>
      )
    })

    return (
      <div key="playlist-list">
        {content}
      </div>

    )
  }

  handleChange(event) {
    this.setState({ playlistName: event.target.value });
  }
}