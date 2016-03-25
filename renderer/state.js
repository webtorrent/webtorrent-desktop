var os = require('os')
var path = require('path')

var config = require('../config')
var LocationHistory = require('./lib/location-history')

module.exports = {
  /*
   * Temporary state disappears once the program exits.
   * It can contain complex objects like open connections, etc.
   */
  client: null, /* the WebTorrent client */
  server: null, /* local WebTorrent-to-HTTP server */
  prev: {}, /* used for state diffing in updateElectron() */
  location: new LocationHistory(),
  window: {
    bounds: null, /* {x, y, width, height } */
    isFocused: true,
    isFullScreen: false,
    title: config.APP_WINDOW_TITLE
  },
  selectedInfoHash: null, /* the torrent we've selected to view details. see state.torrents */
  playing: { /* the media (audio or video) that we're currently playing */
    infoHash: null, /* the info hash of the torrent we're playing */
    fileIndex: null, /* the zero-based index within the torrent */
    location: 'local', /* 'local', 'chromecast', 'airplay' */
    type: null, /* 'audio' or 'video' */
    currentTime: 0, /* seconds */
    duration: 1, /* seconds */
    isPaused: true,
    mouseStationarySince: 0 /* Unix time in ms */
  },
  devices: { /* playback devices like Chromecast and AppleTV */
    airplay: null, /* airplay client. finds and manages AppleTVs */
    chromecast: null /* chromecast client. finds and manages Chromecasts */
  },
  dock: {
    badge: 0,
    progress: 0
  },
  errors: [], /* user-facing errors */

  /*
   * Saved state is read from and written to a file every time the app runs.
   * It should be simple and minimal and must be JSON.
   *
   * Config path:
   *
   * OS X                 ~/Library/Application Support/WebTorrent/config.json
   * Linux (XDG)          $XDG_CONFIG_HOME/WebTorrent/config.json
   * Linux (Legacy)       ~/.config/WebTorrent/config.json
   * Windows (> Vista)    %LOCALAPPDATA%/WebTorrent/config.json
   * Windows (XP, 2000)   %USERPROFILE%/Local Settings/Application Data/WebTorrent/config.json
   *
   * Also accessible via `require('application-config')('WebTorrent').filePath`
   */
  saved: {},

  /* If the saved state file doesn't exist yet, here's what we use instead */
  defaultSavedState: {
    version: 1, /* make sure we can upgrade gracefully later */
    torrents: [
      {
        status: 'paused',
        infoHash: '88594aaacbde40ef3e2510c47374ec0aa396c08e',
        displayName: 'Big Buck Bunny',
        posterURL: path.join('..', 'static', 'bigBuckBunny.jpg'),
        torrentPath: path.join('.', 'static', 'bigBuckBunny.torrent'),
        files: [
          {
            'name': 'bbb_sunflower_1080p_30fps_normal.mp4',
            'length': 276134947,
            'numPiecesPresent': 0,
            'numPieces': 527
          }
        ]
      },
      {
        status: 'paused',
        infoHash: '6a9759bffd5c0af65319979fb7832189f4f3c35d',
        displayName: 'Sintel',
        posterURL: path.join('..', 'static', 'sintel.jpg'),
        torrentPath: path.join('.', 'static', 'sintel.torrent'),
        files: [
          {
            'name': 'sintel.mp4',
            'length': 129241752,
            'numPiecesPresent': 0,
            'numPieces': 987
          }
        ]
      },
      {
        status: 'paused',
        infoHash: '02767050e0be2fd4db9a2ad6c12416ac806ed6ed',
        displayName: 'Tears of Steel',
        posterURL: path.join('..', 'static', 'tearsOfSteel.jpg'),
        torrentPath: path.join('.', 'static', 'tearsOfSteel.torrent'),
        files: [
          {
            'name': 'tears_of_steel_1080p.webm',
            'length': 571346576,
            'numPiecesPresent': 0,
            'numPieces': 2180
          }
        ]
      }
    ],
    downloadPath: path.join(os.homedir(), 'Downloads')
  }
}
