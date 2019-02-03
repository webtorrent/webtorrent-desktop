const React = require('react')
const { dispatcher } = require('../lib/dispatcher')

module.exports = class PlaylistList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {playlistName: ''};

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
    const playlists = dispatcher('getAllPlaylists')
    const content = []
    // playlists.forEach((playlist) => {
    //   console.log(123, playlist)
    //   content.push(
    //     <div>{playlist[0].name}</div>
    //   )
    // })

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
    this.setState({playlistName: event.target.value});
  }
}