var electron = require('electron')
var path = require('path')

var remote = electron.remote

var config = require('../config')
var LocationHistory = require('./lib/location-history')

module.exports = {
  getInitialState,
  getDefaultPlayState,
  getDefaultSavedState,
  getPlayingTorrentSummary
}

function getInitialState () {
  return {
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
    playing: getDefaultPlayState(), /* the media (audio or video) that we're currently playing */
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
    nextTorrentKey: 1, /* identify torrents for IPC between the main and webtorrent windows */

    /*
     * Saved state is read from and written to a file every time the app runs.
     * It should be simple and minimal and must be JSON.
     * It must never contain absolute paths since we have a portable app.
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

    /*
     * Getters, for convenience
     */
    getPlayingTorrentSummary
  }
}

/* Whenever we stop playing video or audio, here's what we reset state.playing to */
function getDefaultPlayState () {
  return {
    infoHash: null, /* the info hash of the torrent we're playing */
    fileIndex: null, /* the zero-based index within the torrent */
    location: 'local', /* 'local', 'chromecast', 'airplay' */
    type: null, /* 'audio' or 'video', could be 'other' if ever support eg streaming to VLC */
    currentTime: 0, /* seconds */
    duration: 1, /* seconds */
    isPaused: true,
    isStalled: false,
    lastTimeUpdate: 0, /* Unix time in ms */
    mouseStationarySince: 0, /* Unix time in ms */
    subtitles: {
      tracks: [], /* subtitle tracks, each {label, language, ...} */
      selectedIndex: -1, /* current subtitle track */
      showMenu: false /* popover menu, above the video */
    },
    aspectRatio: 0 /* aspect ratio of the video */
  }
}

/* If the saved state file doesn't exist yet, here's what we use instead */
function getDefaultSavedState () {
  return {
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
            length: 276134947,
            name: 'bbb_sunflower_1080p_30fps_normal.mp4'
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
            length: 129241752,
            name: 'sintel.mp4'
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
            length: 571346576,
            name: 'tears_of_steel_1080p.webm'
          }
        ]
      },
      {
        status: 'paused',
        infoHash: '6a02592d2bbc069628cd5ed8a54f88ee06ac0ba5',
        magnetURI: 'magnet:?xt=urn:btih:6a02592d2bbc069628cd5ed8a54f88ee06ac0ba5&dn=CosmosLaundromatFirstCycle&tr=http%3A%2F%2Fbt1.archive.org%3A6969%2Fannounce&tr=http%3A%2F%2Fbt2.archive.org%3A6969%2Fannounce&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io&ws=http%3A%2F%2Fia601508.us.archive.org%2F14%2Fitems%2F&ws=http%3A%2F%2Fia801508.us.archive.org%2F14%2Fitems%2F&ws=https%3A%2F%2Farchive.org%2Fdownload%2F',
        displayName: 'Cosmos Laundromat (Preview)',
        posterURL: 'cosmosLaundromat.jpg',
        torrentPath: 'cosmosLaundromat.torrent',
        files: [
          {
            length: 223580,
            name: 'Cosmos Laundromat - First Cycle (1080p).gif'
          },
          {
            length: 220087570,
            name: 'Cosmos Laundromat - First Cycle (1080p).mp4'
          },
          {
            length: 56832560,
            name: 'Cosmos Laundromat - First Cycle (1080p).ogv'
          },
          {
            length: 3949,
            name: 'CosmosLaundromat-FirstCycle1080p.en.srt'
          },
          {
            length: 3907,
            name: 'CosmosLaundromat-FirstCycle1080p.es.srt'
          },
          {
            length: 4119,
            name: 'CosmosLaundromat-FirstCycle1080p.fr.srt'
          },
          {
            length: 3941,
            name: 'CosmosLaundromat-FirstCycle1080p.it.srt'
          },
          {
            length: 11264,
            name: 'CosmosLaundromatFirstCycle_meta.sqlite'
          },
          {
            length: 1204,
            name: 'CosmosLaundromatFirstCycle_meta.xml'
          }
        ]
      },
      {
        status: 'paused',
        infoHash: '3ba219a8634bf7bae3d848192b2da75ae995589d',
        magnetURI: 'magnet:?xt=urn:btih:3ba219a8634bf7bae3d848192b2da75ae995589d&dn=The+WIRED+CD+-+Rip.+Sample.+Mash.+Share.&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F',
        displayName: 'The WIRED CD - Rip. Sample. Mash. Share.',
        posterURL: 'wired-cd.jpg',
        torrentPath: 'wired-cd.torrent',
        files: [
          {
            length: 1964275,
            name: '01 - Beastie Boys - Now Get Busy.mp3'
          },
          {
            length: 3610523,
            name: '02 - David Byrne - My Fair Lady.mp3'
          },
          {
            length: 2759377,
            name: '03 - Zap Mama - Wadidyusay.mp3'
          },
          {
            length: 5816537,
            name: '04 - My Morning Jacket - One Big Holiday.mp3'
          },
          {
            length: 2106421,
            name: '05 - Spoon - Revenge!.mp3'
          },
          {
            length: 3347550,
            name: '06 - Gilberto Gil - Oslodum.mp3'
          },
          {
            length: 2107577,
            name: '07 - Dan The Automator - Relaxation Spa Treatment.mp3'
          },
          {
            length: 3108130,
            name: '08 - Thievery Corporation - Dc 3000.mp3'
          },
          {
            length: 3051528,
            name: '09 - Le Tigre - Fake French.mp3'
          },
          {
            length: 3270259,
            name: '10 - Paul Westerberg - Looking Up In Heaven.mp3'
          },
          {
            length: 3263528,
            name: '11 - Chuck D - No Meaning No (feat. Fine Arts Militia).mp3'
          },
          {
            length: 6380952,
            name: '12 - The Rapture - Sister Saviour (Blackstrobe Remix).mp3'
          },
          {
            length: 6550396,
            name: '13 - Cornelius - Wataridori 2.mp3'
          },
          {
            length: 3034692,
            name: '14 - DJ Danger Mouse - What U Sittin\' On (feat. Jemini, Cee Lo And Tha Alkaholiks).mp3'
          },
          {
            length: 3854611,
            name: '15 - DJ Dolores - Oslodum 2004.mp3'
          },
          {
            length: 1762120,
            name: '16 - Matmos - Action At A Distance.mp3'
          },
          {
            length: 4071,
            name: 'README.md'
          },
          {
            length: 78163,
            name: 'poster.jpg'
          }
        ]
      }
    ],
    downloadPath: config.IS_PORTABLE
      ? path.join(config.CONFIG_PATH, 'Downloads')
      : remote.app.getPath('downloads')
  }
}

function getPlayingTorrentSummary () {
  var infoHash = this.playing.infoHash
  return this.saved.torrents.find((x) => x.infoHash === infoHash)
}
