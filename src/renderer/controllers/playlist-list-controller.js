const electron = require('electron')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const config = require('../../config')

const { dispatch } = require('../lib/dispatcher')

//TODO: The same function is on torrent-list-controller.js refactor somehow
// and share the function.
function deleteFile(path) {
    if (!path) return
    //We use sync here because I have a race conditoon when I try to delete the default playlist
    fs.unlinkSync(path, function (err) {
        if (err) dispatch('error', err)
    })
}

module.exports = class PlaylistListController {
    constructor(state) {
        this.state = state
        this.state.saved.allPlaylists = this.getAllPlaylists()
        this.state.saved.playlistSelected = this.getPlaylistSelected()
    }

    getAllPlaylists() {
        var files = fs.readdirSync(config.PLAYLIST_PATH);
    
        //We just want json files to avoid rubbish or system files.
        files = files.filter(file => file.endsWith('.json'))
    
        const playlists = []
        files.forEach(file => {
            file = file.replace('.json', '')
            playlists.push(file);
        });
    
        return playlists;
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

        mkdirp(config.PLAYLIST_PATH, () => {
            fs.writeFile(playlistPath, JSON.stringify(headerPlaylist), (err) => {
                if (err) return console.log('error saving playlist file %s: %o', playlistPath, err)
                console.log('The playlist has been created');
                this.setPlaylist(id)

                //TODO: Delete this from here and do it better?
                //We are reloading the state of allPlaylist to render them
                this.state.saved.allPlaylists = this.getAllPlaylists()
                dispatch('stateSave')
            })
        })
    }

    setPlaylist(id) {
        this.state.saved.playlistSelected = this.readPlaylistFile(id)
    }

    getPlaylistSelected() {
        if (!this.state.saved.playlistSelected) {
            this.state.saved.playlistSelected = this.state.saved.allPlaylists[0]
        }
        
        //Just in case read the playlist from the file instead of the one in localStorage.
        return this.readPlaylistFile(this.state.saved.playlistSelected.id);
        // return this.state.saved.playlistSelected
    }

    readPlaylistFile(id) {
        const playlistPath = path.join(config.PLAYLIST_PATH, id + '.json')

        let fileContents

        try {
            fileContents = fs.readFileSync(playlistPath, 'utf8')
        } catch (err) {
            // Here you get the error when the file was not found,
            // but you also get any other error
            console.log(`${playlistPath}: File not found!, Returning an empty playlist.`);
            return { "id": id, "torrents": [] }
        }

        return JSON.parse(fileContents);
    }

    getAlbumFromPlaylist(infoHash) {
        return this.state.saved.playlistSelected.torrents.find(item => item.infoHash === infoHash);
    }

    addAlbumToPlaylist(infoHash, files) {
        //First we search if the actual album is in the playlist, if it is we deleted it
        //And then add the whole album.
        const albumOnPlaylist = this.getAlbumFromPlaylist(infoHash)
        if (albumOnPlaylist) {
            this.state.saved.playlistSelected.torrents = this.state.saved.playlistSelected.torrents.filter(item => item.infoHash != infoHash)
        }

        files = files.map(item => item.name)
        this.state.saved.playlistSelected.torrents.push({
            infoHash,
            files
        })

        this.writePlaylistFile()
        dispatch('stateSave')
    }

    removeSongFromPlaylist(infoHash, file) {
        let albumOnPlaylist = this.getAlbumFromPlaylist(infoHash)
        albumOnPlaylist.files = albumOnPlaylist.files.filter(el => el !== file.name)

        //If there are no more files in the album, delete it
        if (albumOnPlaylist.files.length === 0) {
            this.state.saved.playlistSelected.torrents = this.state.saved.playlistSelected.torrents.filter(el => el.infoHash !== infoHash)
        }

        this.writePlaylistFile();
        dispatch('stateSave')
    }

    addSongToPlaylist(infoHash, file) {
        //First we search if the actual album is in the playlist, if it is 
        //We add the song to the object, if not we create a the object
        const albumOnPlaylist = this.getAlbumFromPlaylist(infoHash)
        if (albumOnPlaylist) {
            albumOnPlaylist.files.push(file.name)
    
            //We set just unique values of the array to avoid repeated songs.
            albumOnPlaylist.files = albumOnPlaylist.files.filter((v, i, a) => a.indexOf(v) === i);
        } else {
            this.state.saved.playlistSelected.torrents.push({
                infoHash,
                files: [file.name]
            })
        }

        this.writePlaylistFile()
        dispatch('stateSave')
    }

    writePlaylistFile() {
        const playlistPath = path.join(config.PLAYLIST_PATH, this.state.saved.playlistSelected.id + '.json')
        const playlistString = JSON.stringify(this.state.saved.playlistSelected, null, 2)

        mkdirp(config.PLAYLIST_PATH, () => {
            fs.writeFile(playlistPath, playlistString, (err) => {
                if (err) return console.log('error saving album to playlist %s: %o', playlistPath, err)
                console.log(`The playlist file ${this.state.saved.playlistSelected.id}.json has been saved`);
            })
        })
    }

    confirmDeletePlaylist(playlistId) {
        this.state.modal = {
            id: 'remove-playlist-modal',
            playlistId
        }
    }

    deletePlaylist(id) {
        const playlistPath = path.join(config.PLAYLIST_PATH, id + '.json')
        deleteFile(playlistPath);
        
        //We delete the playlist from the playlists array
        this.state.saved.allPlaylists = this.state.saved.allPlaylists.filter(item => item !== id )

        //If the playlist that we delete is the current selected one, unselect it
        if (this.state.saved.playlistSelected.id === id) {

            // If there is other playlist on the array, select the first one
            // Otherwhise create a new one.
            if (this.state.saved.allPlaylists.length > 0) {
                this.setPlaylist(this.state.saved.allPlaylists[0])
            } else {
                this.createPlaylist('default')
            }             
        }
        dispatch('stateSave')
    }

}