const electron = require('electron')
const fs = require('fs')

const config = require('../../config')


module.exports = class PlaylistsController {
    constructor (state) {
        this.state = state
        this.playlist = {name: 'playlist', torrents:[]}
    }

    getAllPlaylists() {
        fs.readdir(config.PLAYLIST_PATH, (err, files) => {
            const playlists = []
            files.forEach(file => {
                playlists.push(file);
            });
            this.state.playlistsList = playlists;
        })
    }

    createPlaylist (name) {
        //We set the name of the playlist in the property called name in the first position.
        const headerPlaylist = {name, torrents: []}
        fs.writeFile(`${config.PLAYLIST_PATH}/${name}.json`, JSON.stringify(headerPlaylist), (err) => {
            if (err) throw err;
            console.log('The playlist has been created');
        });
    }

    addAlbumToPlaylist (infohash, files) {
        //First we search if the actual album is in the playlist, if it is we deleted it
        //And then add the whole album.
        const albumInPlaylist = this.playlist.torrents.find(item => item.infohash === infohash);
        if (albumInPlaylist) {
            this.playlist = this.playlist.torrents.filter(item => item.infohash != infohash)
        }

        files = files.map(item => item.name)
        this.playlist.torrents.push({
            infohash,
            files
        })

        const playlistName = this.playlist.name

        fs.writeFile(`${config.PLAYLIST_PATH}/${playlistName}.json`, JSON.stringify(this.playlist), (err) => {
            if (err) throw err;
            console.log('The album has been added to the playlist');
        });

    }
}