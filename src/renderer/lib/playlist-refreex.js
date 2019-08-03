const config = require('../../config')
const path = require('path')
const fs = require('fs')

module.exports = {
  isRefreexPlaylist,
  readPlaylistFile
}

function isJson(str) {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
}

// Checks if the argument is either:
// - a string that's a valid filename ending in .json
// - a file object where obj.name is ends in .json
// - a valid json that contains a playlist and not other content.
function isRefreexPlaylist (file) {
  const isPlaylistFile = getFileExtension(file) === '.json'
  const isValidPlaylist = typeof file === 'string' && isValidRefreexPlaylist(file)
  
  return isPlaylistFile || isValidPlaylist
}

function getFileExtension (file) {
  const name = typeof file === 'string' ? file : file.name
  return path.extname(name).toLowerCase()
}

function isValidRefreexPlaylist(playlistString) {

  //First we check if is Json or not to add a playlist or a torrent
  if (isJson(playlistString)) {

    // If is json we parse it and then we check if is a valid playlist
    // asking if they have a property torrents and id
    let playlistObj = JSON.parse(playlistString)
    if (playlistObj.id && playlistObj.torrents) {
      return true;
    }

  }

  return false
}

function readPlaylistFile(id) {
  const playlistPath = path.join(config.PLAYLIST_PATH, id + '.json')
  
  let fileContents
  try {
      fileContents = fs.readFileSync(playlistPath, 'utf8')
  } catch (err) {
      // Here you get the error when the file was not found,
      // but you also get any other error
      console.log(`fn readPlaylistFile: ${playlistPath} - ${err}`);
      return { "id": id, "torrents": [] }
  }

  return JSON.parse(fileContents);
}
