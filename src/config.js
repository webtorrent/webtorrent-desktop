const appConfig = require('application-config')('WebTorrent')
const fs = require('fs')
const path = require('path')
const electron = require('electron')

const APP_NAME = 'WebTorrent'
const APP_TEAM = 'WebTorrent, LLC'
const APP_VERSION = require('../package.json').version

const IS_TEST = isTest()
const PORTABLE_PATH = IS_TEST
  ? path.join(__dirname, '../test/tempTestData')
  : path.join(path.dirname(process.execPath), 'Portable Settings')
const IS_PORTABLE = isPortable()
const IS_PRODUCTION = isProduction()

console.log('Production: %s portable: %s test: %s',
  IS_PRODUCTION, IS_PORTABLE, IS_TEST)
if (IS_PORTABLE) console.log('Portable path: %s', PORTABLE_PATH)

module.exports = {
  ANNOUNCEMENT_URL: 'https://webtorrent.io/desktop/announcement',
  AUTO_UPDATE_URL: 'https://webtorrent.io/desktop/update',
  CRASH_REPORT_URL: 'https://webtorrent.io/desktop/crash-report',
  TELEMETRY_URL: 'https://webtorrent.io/desktop/telemetry',

  APP_COPYRIGHT: 'Copyright © 2014-2016 ' + APP_TEAM,
  APP_FILE_ICON: path.join(__dirname, '..', 'static', 'WebTorrentFile'),
  APP_ICON: path.join(__dirname, '..', 'static', 'WebTorrent'),
  APP_NAME: APP_NAME,
  APP_TEAM: APP_TEAM,
  APP_VERSION: APP_VERSION,
  APP_WINDOW_TITLE: APP_NAME + ' (BETA)',

  CONFIG_PATH: getConfigPath(),

  DEFAULT_TORRENTS: [
    {
      name: 'Big Buck Bunny',
      posterFileName: 'bigBuckBunny.jpg',
      torrentFileName: 'bigBuckBunny.torrent'
    },
    {
      name: 'Cosmos Laundromat (Preview)',
      posterFileName: 'cosmosLaundromat.jpg',
      torrentFileName: 'cosmosLaundromat.torrent'
    },
    {
      name: 'Sintel',
      posterFileName: 'sintel.jpg',
      torrentFileName: 'sintel.torrent'
    },
    {
      name: 'Tears of Steel',
      posterFileName: 'tearsOfSteel.jpg',
      torrentFileName: 'tearsOfSteel.torrent'
    },
    {
      name: 'The WIRED CD - Rip. Sample. Mash. Share.',
      posterFileName: 'wiredCd.jpg',
      torrentFileName: 'wiredCd.torrent'
    }
  ],

  DELAYED_INIT: 3000 /* 3 seconds */,

  DEFAULT_DOWNLOAD_PATH: getDefaultDownloadPath(),

  GITHUB_URL: 'https://github.com/feross/webtorrent-desktop',
  GITHUB_URL_ISSUES: 'https://github.com/feross/webtorrent-desktop/issues',
  GITHUB_URL_RAW: 'https://raw.githubusercontent.com/feross/webtorrent-desktop/master',

  HOME_PAGE_URL: 'https://webtorrent.io',

  IS_PORTABLE: IS_PORTABLE,
  IS_PRODUCTION: IS_PRODUCTION,
  IS_TEST: IS_TEST,

  POSTER_PATH: path.join(getConfigPath(), 'Posters'),
  ROOT_PATH: path.join(__dirname, '..'),
  STATIC_PATH: path.join(__dirname, '..', 'static'),
  TORRENT_PATH: path.join(getConfigPath(), 'Torrents'),

  WINDOW_ABOUT: 'file://' + path.join(__dirname, '..', 'static', 'about.html'),
  WINDOW_MAIN: 'file://' + path.join(__dirname, '..', 'static', 'main.html'),
  WINDOW_WEBTORRENT: 'file://' + path.join(__dirname, '..', 'static', 'webtorrent.html'),

  WINDOW_MIN_HEIGHT: 38 + (120 * 2), // header height + 2 torrents
  WINDOW_MIN_WIDTH: 425
}

function getConfigPath () {
  if (IS_PORTABLE) {
    return PORTABLE_PATH
  } else {
    return path.dirname(appConfig.filePath)
  }
}

function getDefaultDownloadPath () {
  if (!process || !process.type) {
    return ''
  } else if (IS_PORTABLE) {
    return path.join(getConfigPath(), 'Downloads')
  } else {
    return getPath('downloads')
  }
}

function getPath (key) {
  if (process.type === 'renderer') {
    return electron.remote.app.getPath(key)
  } else {
    electron.app.getPath(key)
  }
}

function isTest () {
  return process.env.NODE_ENV === 'test'
}

function isPortable () {
  if (IS_TEST) {
    return true
  }
  try {
    return process.platform === 'win32' && IS_PRODUCTION && !!fs.statSync(PORTABLE_PATH)
  } catch (err) {
    return false
  }
}

function isProduction () {
  if (!process.versions.electron) {
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
