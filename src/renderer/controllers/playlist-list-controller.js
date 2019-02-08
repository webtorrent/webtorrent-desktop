const electron = require('electron')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

const config = require('../../config')


module.exports = class PlaylistListController {
    constructor(state) {
        this.state = state
        //TODO: CREATE playlist.json as a default playlist
        // this.playlist = {"id":"playlist","torrents":[]}
        this.playlist = this.getPlaylistSelected();
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

    checkIfPlaylistFileExists(path) {
        return fs.existsSync(path);
    }

    createPlaylist(id) {
        const playlistPath = path.join(config.PLAYLIST_PATH, id + '.json')

        //Check if a playlist with the same name exists
        const isPlaylistCreated = this.checkIfPlaylistFileExists(playlistPath)
        if (isPlaylistCreated) return console.log('A playlist with the same name is already created: %s', id)

        //We set the id of the playlist in the property called id in the first position.
        const headerPlaylist = { id, torrents: [] }

        //TODO: SEE HOW CAN WE AVOID THE _this = this TO BE MORE FUZZY :)
        const _this = this;
        mkdirp(config.PLAYLIST_PATH, function (_) {
            fs.writeFile(playlistPath, JSON.stringify(headerPlaylist), function (err) {
                if (err) return console.log('error saving playlist file %s: %o', playlistPath, err)
                console.log('The playlist has been created');
                _this.setPlaylist(id)
            })
        })
    }

    setPlaylist(id) {
        this.playlist = this.readPlaylistFile(id)
    }

    getPlaylistSelected() {
        //Just in case read the playlist from the file instead of the one in localStorage.
        const playlistSelected = JSON.parse(localStorage.getItem('idPlaylistSelected'))

        return this.readPlaylistFile(playlistSelected.id)
    }

    readPlaylistFile(id) {
        const playlistPath = path.join(config.PLAYLIST_PATH, id + '.json')
        const file = fs.readFileSync(playlistPath, 'utf8')

        return JSON.parse(file);
    }

    addAlbumToPlaylist(infohash, files) {
        //First we search if the actual album is in the playlist, if it is we deleted it
        //And then add the whole album.

        const albumInPlaylist = this.playlist.torrents.find(item => item.infohash === infohash);
        if (albumInPlaylist) {
            this.playlist.torrents = this.playlist.torrents.filter(item => item.infohash != infohash)
        }

        files = files.map(item => item.name)
        this.playlist.torrents.push({
            infohash,
            files
        })

        const playlistPath = path.join(config.PLAYLIST_PATH, this.playlist.id + '.json')
        const playlistString = JSON.stringify(this.playlist, null, 2)

        mkdirp(config.PLAYLIST_PATH, function (_) {
            fs.writeFile(playlistPath, playlistString, function (err) {
                if (err) return console.log('error saving album to playlist %s: %o', playlistPath, err)
                console.log('The album has been added to the playlist');
            })
        })
    }

    confirmDeletePlaylist(playlistId) {
        console.log(this.state)
        this.state.modal = {
            id: 'remove-playlist-modal',
            playlistId
        }
    }

    deletePlaylist(id) {
        const playlistPath = path.join(config.PLAYLIST_PATH, id + '.json')
        deleteFile(playlistPath);
    }

}

//TODO: The same function is on torrent-list-controller.js refactor somehow
// and share the function.
function deleteFile(path) {
    if (!path) return
    fs.unlink(path, function (err) {
        if (err) dispatch('error', err)
    })
}