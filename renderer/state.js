var os = require('os')
var path = require('path')

var config = require('../config')

module.exports = {
  /* Temporary state disappears once the program exits.
   * It can contain complex objects like open connections, etc.
   */
  client: null, /* the WebTorrent client */
  prev: {}, /* used for state diffing in updateElectron() */
  server: null, /* local WebTorrent-to-HTTP server */
  torrentPlaying: null, /* the torrent we're streaming. see client.torrents */
  selectedInfoHash: null, /* the torrent we've selected to view details. see state.torrents */
  // history: [], /* track how we got to the current view. enables Back button */
  // historyIndex: 0,
  url: 'home',
  devices: {
    airplay: null, /* airplay client. finds and manages AppleTVs */
    chromecast: null /* chromecast client. finds and manages Chromecasts */
  },
  dock: {
    badge: 0,
    progress: 0
  },
  window: {
    bounds: null, /* x y width height */
    isFocused: true,
    isFullScreen: false,
    title: config.APP_NAME /* current window title */
  },
  video: {
    currentTime: 0, /* seconds */
    duration: 1, /* seconds */
    isPaused: false,
    mouseStationarySince: 0 /* Unix time in ms */
  },

  /* Saved state is read from and written to a file every time the app runs.
   * It should be simple and minimal and must be JSON.
   *
   * Config path:
   *
   * OS XDG               ~/Library/Application Support/WebTorrent/config.json
   * Linux (XDG)          $XDG_CONFIG_HOME/WebTorrent/config.json
   * Linux (Legacy)       ~/.config/WebTorrent/config.json
   * Windows (> Vista)    %LOCALAPPDATA%/WebTorrent/config.json
   * Windows (XP, 2000)   %USERPROFILE%/Local Settings/Application Data/WebTorrent/config.json
   *
   * Also accessible via `require('application-config')('WebTorrent').filePath`
   */
  saved: {
    torrents: []
  },

  /* If the saved state file doesn't exist yet, here's what we use instead */
  defaultSavedState: {
    version: 1, /* make sure we can upgrade gracefully later */
    torrents: [
      {
        status: 'paused',
        infoHash: 'f84b51f0d2c3455ab5dabb6643b4340234cd036e',
        displayName: 'Big Buck Bunny',
        posterURL: path.join(__dirname, '..', 'static', 'bigBuckBunny.jpg')
      },
      {
        status: 'paused',
        infoHash: '6a9759bffd5c0af65319979fb7832189f4f3c35d',
        displayName: 'Sintel',
        posterURL: path.join(__dirname, '..', 'static', 'sintel.jpg')
      },
      {
        status: 'paused',
        infoHash: '02767050e0be2fd4db9a2ad6c12416ac806ed6ed',
        displayName: 'Tears of Steel',
        posterURL: path.join(__dirname, '..', 'static', 'tearsOfSteel.jpg')
      }
    ],
    downloadPath: path.join(os.homedir(), 'Downloads')
  }
}
