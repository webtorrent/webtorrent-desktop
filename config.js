var appConfig = require('application-config')('WebTorrent')
var fs = require('fs')
var path = require('path')

var APP_NAME = 'WebTorrent'
var APP_TEAM = 'The WebTorrent Project'
var APP_VERSION = require('./package.json').version

var PORTABLE_PATH = path.join(path.dirname(process.execPath), 'Portable Settings')

module.exports = {
  APP_COPYRIGHT: 'Copyright © 2014-2016 ' + APP_TEAM,
  APP_FILE_ICON: path.join(__dirname, 'static', 'WebTorrentFile'),
  APP_ICON: path.join(__dirname, 'static', 'WebTorrent'),
  APP_NAME: APP_NAME,
  APP_TEAM: APP_TEAM,
  APP_VERSION: APP_VERSION,
  APP_WINDOW_TITLE: APP_NAME + ' (BETA)',

  AUTO_UPDATE_URL: 'https://webtorrent.io/desktop/update' +
    '?version=' + APP_VERSION + '&platform=' + process.platform,

  CRASH_REPORT_URL: 'https://webtorrent.io/desktop/crash-report',

  CONFIG_PATH: getConfigPath(),
  CONFIG_POSTER_PATH: path.join(getConfigPath(), 'Posters'),
  CONFIG_TORRENT_PATH: path.join(getConfigPath(), 'Torrents'),

  DELAYED_INIT: 3000 /* 3 seconds */,

  GITHUB_URL: 'https://github.com/feross/webtorrent-desktop',
  GITHUB_URL_ISSUES: 'https://github.com/feross/webtorrent-desktop/issues',
  GITHUB_URL_RAW: 'https://raw.githubusercontent.com/feross/webtorrent-desktop/master',

  HOME_PAGE_URL: 'https://webtorrent.io',

  IS_PORTABLE: isPortable(),
  IS_PRODUCTION: isProduction(),

  ROOT_PATH: __dirname,
  STATIC_PATH: path.join(__dirname, 'static'),

  WINDOW_ABOUT: 'file://' + path.join(__dirname, 'renderer', 'about.html'),
  WINDOW_MAIN: 'file://' + path.join(__dirname, 'renderer', 'main.html'),
  WINDOW_WEBTORRENT: 'file://' + path.join(__dirname, 'renderer', 'webtorrent.html'),

  WINDOW_MIN_HEIGHT: 38 + (120 * 2), // header height + 2 torrents
  WINDOW_MIN_WIDTH: 425
}

function getConfigPath () {
  if (isPortable()) {
    return PORTABLE_PATH
  } else {
    return path.dirname(appConfig.filePath)
  }
}

function isPortable () {
  try {
    return process.platform === 'win32' && isProduction() && !!fs.statSync(PORTABLE_PATH)
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
