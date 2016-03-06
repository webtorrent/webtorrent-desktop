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
  title: 'WebTorrent', /* current window title */
  video: {
    isPaused: false,
    currentTime: 0, /* seconds */
    duration: 1, /* seconds */
    mouseStationarySince: 0 /* Unix time in ms */
  },

  /* Saved state is read from and written to ~/.webtorrent/state.json
   * It should be simple and minimal and must be JSONifiable
   */
  saved: {
    torrents: [
      {
        name: 'Sintel',
        torrentFile: 'resources/sintel.torrent'
      },
      {
        name: 'Elephants Dream',
        torrentFile: 'resources/ElephantsDream_archive.torrent'
      },
      {
        name: 'Big Buck Bunny',
        torrentFile: 'resources/BigBuckBunny_archive.torrent'
      },
      {
        name: 'Tears of Steel',
        torrentFile: 'resources/TearsOfSteel_archive.torrent'
      }
    ]
  }
}
