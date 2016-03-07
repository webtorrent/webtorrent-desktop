var config = require('../config')

module.exports = {
  /* Temporary state disappears once the program exits.
   * It can contain complex objects like open connections, etc.
   */
  url: '/',
  client: null, /* the WebTorrent client */
  server: null, /* local WebTorrent-to-HTTP server */
  dock: {
    badge: 0,
    progress: 0
  },
  devices: {
    airplay: null, /* airplay client. finds and manages AppleTVs */
    chromecast: null /* chromecast client. finds and manages Chromecasts */
  },
  torrentPlaying: null, /* the torrent we're streaming. see client.torrents */
  // history: [], /* track how we got to the current view. enables Back button */
  // historyIndex: 0,
  isFocused: true,
  isFullScreen: false,
  mainWindowBounds: null, /* x y width height */
  title: config.APP_NAME, /* current window title */
  video: {
    isPaused: false,
    currentTime: 0, /* seconds */
    duration: 1, /* seconds */
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
  }
}
