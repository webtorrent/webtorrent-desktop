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
  audioInfo: null, /* set whenever an audio file is playing */
  pendingTorrents: {}, /* infohash to WebTorrent handle */
  devices: { /* playback devices like Chromecast and AppleTV */
    airplay: null, /* airplay client. finds and manages AppleTVs */
    chromecast: null /* chromecast client. finds and manages Chromecasts */
  },
  dock: {
    badge: 0,
    progress: 0
  },
  modal: null, /* modal popover */
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
        magnetURI: 'magnet:?xt=urn:btih:88594aaacbde40ef3e2510c47374ec0aa396c08e&dn=bbb_sunflower_1080p_30fps_normal.mp4&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io&ws=http%3A%2F%2Fdistribution.bbb3d.renderfarming.net%2Fvideo%2Fmp4%2Fbbb_sunflower_1080p_30fps_normal.mp4',
        displayName: 'Big Buck Bunny',
        posterURL: 'bigBuckBunny.jpg',
        torrentPath: 'bigBuckBunny.torrent',
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
        magnetURI: 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel-1024-surround.mp4',
        displayName: 'Sintel',
        posterURL: 'sintel.jpg',
        torrentPath: 'sintel.torrent',
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
        magnetURI: 'magnet:?xt=urn:btih:02767050e0be2fd4db9a2ad6c12416ac806ed6ed&dn=tears_of_steel_1080p.webm&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io',
        displayName: 'Tears of Steel',
        posterURL: 'tearsOfSteel.jpg',
        torrentPath: 'tearsOfSteel.torrent',
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
