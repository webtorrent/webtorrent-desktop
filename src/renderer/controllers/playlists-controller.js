const electron = require('electron')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

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
        const playlistPath = path.join(config.PLAYLIST_PATH, name + '.json')

        mkdirp(config.PLAYLIST_PATH, function (_) {
            fs.writeFile(playlistPath, JSON.stringify(headerPlaylist), function (err) {
                if (err) return console.log('error saving playlist file %s: %o', playlistPath, err)
                console.log('The playlist has been created');
            })
        })
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

        const playlistPath = path.join(config.PLAYLIST_PATH, this.playlist.name + '.json')
        mkdirp(config.PLAYLIST_PATH, function (_) {
            fs.writeFile(playlistPath, JSON.stringify(this.playlist), function (err) {
                if (err) return console.log('error saving album to playlist %s: %o', playlistPath, err)
                console.log('The album has been added to the playlist');
            })
        })
    }
}