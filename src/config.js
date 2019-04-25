const appConfig = require('application-config')('WebTorrent')
const path = require('path')
const electron = require('electron')
const arch = require('arch')

const APP_NAME = 'WebTorrent'
const APP_TEAM = 'WebTorrent, LLC'
const APP_VERSION = require('../package.json').version

const IS_TEST = isTest()
const PORTABLE_PATH = IS_TEST
  ? path.join(process.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp', 'WebTorrentTest')
  : path.join(path.dirname(process.execPath), 'Portable Settings')
const IS_PRODUCTION = isProduction()
const IS_PORTABLE = isPortable()

const UI_HEADER_HEIGHT = 38
const UI_TORRENT_HEIGHT = 100

module.exports = {
  ANNOUNCEMENT_URL: 'https://webtorrent.io/desktop/announcement',
  AUTO_UPDATE_URL: 'https://webtorrent.io/desktop/update',
  CRASH_REPORT_URL: 'https://webtorrent.io/desktop/crash-report',
  TELEMETRY_URL: 'https://webtorrent.io/desktop/telemetry',

  APP_COPYRIGHT: 'Copyright © 2014-2019 ' + APP_TEAM,
  APP_FILE_ICON: path.join(__dirname, '..', 'static', 'WebTorrentFile'),
  APP_ICON: path.join(__dirname, '..', 'static', 'WebTorrent'),
  APP_NAME: APP_NAME,
  APP_TEAM: APP_TEAM,
  APP_VERSION: APP_VERSION,
  APP_WINDOW_TITLE: APP_NAME + ' (BETA)',

  CONFIG_PATH: getConfigPath(),

  DEFAULT_TORRENTS: [
    {
      testID: 'bbb',
      name: 'Big Buck Bunny',
      posterFileName: 'bigBuckBunny.jpg',
      torrentFileName: 'bigBuckBunny.torrent'
    },
    {
      testID: 'cosmos',
      name: 'Cosmos Laundromat (Preview)',
      posterFileName: 'cosmosLaundromat.jpg',
      torrentFileName: 'cosmosLaundromat.torrent'
    },
    {
      testID: 'sintel',
      name: 'Sintel',
      posterFileName: 'sintel.jpg',
      torrentFileName: 'sintel.torrent'
    },
    {
      testID: 'tears',
      name: 'Tears of Steel',
      posterFileName: 'tearsOfSteel.jpg',
      torrentFileName: 'tearsOfSteel.torrent'
    },
    {
      testID: 'wired',
      name: 'The WIRED CD - Rip. Sample. Mash. Share',
      posterFileName: 'wiredCd.jpg',
      torrentFileName: 'wiredCd.torrent'
    }
  ],

  DELAYED_INIT: 3000 /* 3 seconds */,

  DEFAULT_DOWNLOAD_PATH: getDefaultDownloadPath(),

  GITHUB_URL: 'https://github.com/webtorrent/webtorrent-desktop',
  GITHUB_URL_ISSUES: 'https://github.com/webtorrent/webtorrent-desktop/issues',
  GITHUB_URL_RAW: 'https://raw.githubusercontent.com/webtorrent/webtorrent-desktop/master',

  HOME_PAGE_URL: 'https://webtorrent.io',

  IS_PORTABLE: IS_PORTABLE,
  IS_PRODUCTION: IS_PRODUCTION,
  IS_TEST: IS_TEST,

  OS_SYSARCH: arch() === 'x64' ? 'x64' : 'ia32',

  POSTER_PATH: path.join(getConfigPath(), 'Posters'),
  ROOT_PATH: path.join(__dirname, '..'),
  STATIC_PATH: path.join(__dirname, '..', 'static'),
  TORRENT_PATH: path.join(getConfigPath(), 'Torrents'),

  WINDOW_ABOUT: 'file://' + path.join(__dirname, '..', 'static', 'about.html'),
  WINDOW_MAIN: 'file://' + path.join(__dirname, '..', 'static', 'main.html'),
  WINDOW_WEBTORRENT: 'file://' + path.join(__dirname, '..', 'static', 'webtorrent.html'),

  WINDOW_INITIAL_BOUNDS: {
    width: 500,
    height: UI_HEADER_HEIGHT + (UI_TORRENT_HEIGHT * 6) // header + 6 torrents
  },
  WINDOW_MIN_HEIGHT: UI_HEADER_HEIGHT + (UI_TORRENT_HEIGHT * 2), // header + 2 torrents
  WINDOW_MIN_WIDTH: 425,

  UI_HEADER_HEIGHT: UI_HEADER_HEIGHT,
  UI_TORRENT_HEIGHT: UI_TORRENT_HEIGHT
}

function getConfigPath () {
  if (IS_PORTABLE) {
    return PORTABLE_PATH
  } else {
    return path.dirname(appConfig.filePath)
  }
}

function getDefaultDownloadPath () {
  if (IS_PORTABLE) {
    return path.join(getConfigPath(), 'Downloads')
  } else {
    return getPath('downloads')
  }
}

function getPath (key) {
  if (!process.versions.electron) {
    // Node.js process
    return ''
  } else if (process.type === 'renderer') {
    // Electron renderer process
    return electron.remote.app.getPath(key)
  } else {
    // Electron main process
    return electron.app.getPath(key)
  }
}

function isTest () {
  return process.env.NODE_ENV === 'test'
}

function isPortable () {
  if (IS_TEST) {
    return true
  }

  if (process.platform !== 'win32' || !IS_PRODUCTION) {
    // Fast path: Non-Windows platforms should not check for path on disk
    return false
  }

  const fs = require('fs')

  try {
    // This line throws if the "Portable Settings" folder does not exist, and does
    // nothing otherwise.
    fs.accessSync(PORTABLE_PATH, fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch (err) {
    return false
  }
}

function isProduction () {
  if (!process.versions.electron) {
    // Node.js process
    return false
  }
  if (process.platform === 'darwin') {
    return !/\/Electron\.app\//.test(process.execPath)
  }
  if (process.platform === 'win32') {
    return !/\\electron\.exe$/.test(process.execPath)
  }
  if (process.platform === 'linux') {
    return !/\/electron$/.test(process.execPath)
  }
}
