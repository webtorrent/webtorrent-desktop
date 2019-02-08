const React = require('react')
const { dispatcher } = require('../lib/dispatcher')

//TODO : MOVE THIS FUNCTION TO THE CONTROLLER I DON'T KNOW HOW TO DO IT.
const fs = require('fs')
const config = require('../../config')

function getAllPlaylists() {

    var files = fs.readdirSync(config.PLAYLIST_PATH);
    const playlists = []
    files.forEach(file => {
        file = file.replace('.json', '')
        playlists.push(file);
    });

    return playlists

    //TODO: how can I use this in the function call below ?
    // fs.readdirSync(config.PLAYLIST_PATH, (err, files) => {
    //     const playlists = []
    //     files.forEach(file => {
    //         playlists.push(file);
    //     });
    //     console.log(playlists)
    //     this.state.Allplaylists = playlists;
  
    // })
  }
// ------

module.exports = class PlaylistList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { playlistName: '' };
    this.state.Allplaylists = ''

    this.state.allPlaylists = getAllPlaylists();
    console.log(this.state.allPlaylists)
    this.handleChange = this.handleChange.bind(this)
    // this.createPlaylist = this.createPlaylist.bind(this)
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

  //TODO: Ask why i can use this function instead of dispatcher in the onclick
  // createPlaylist() {
  //   this.setState({playlistName: ''})
  //   dispatcher('createPlaylist', this.state.playlistName)
  // }


  handleChange(event) {
    this.setState({ playlistName: event.target.value });
  }
}