var applicationConfigPath = require('application-config-path')
var path = require('path')

var APP_NAME = 'WebTorrent'
var APP_TEAM = 'The WebTorrent Project'
var APP_VERSION = require('./package.json').version

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
  AUTO_UPDATE_CHECK_STARTUP_DELAY: 5 * 1000 /* 5 seconds */,

  CRASH_REPORT_URL: 'https://webtorrent.io/desktop/crash-report',

  CONFIG_PATH: applicationConfigPath(APP_NAME),
  CONFIG_POSTER_PATH: path.join(applicationConfigPath(APP_NAME), 'Posters'),
  CONFIG_TORRENT_PATH: path.join(applicationConfigPath(APP_NAME), 'Torrents'),

  GITHUB_URL: 'https://github.com/feross/webtorrent-desktop',
  GITHUB_URL_RAW: 'https://raw.githubusercontent.com/feross/webtorrent-desktop/master',

  IS_PRODUCTION: isProduction(),

  ROOT_PATH: __dirname,
  STATIC_PATH: path.join(__dirname, 'static'),

  SOUND_ADD: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'add.wav'),
    volume: 0.2
  },
  SOUND_DELETE: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'delete.wav'),
    volume: 0.1
  },
  SOUND_DISABLE: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'disable.wav'),
    volume: 0.2
  },
  SOUND_DONE: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'done.wav'),
    volume: 0.2
  },
  SOUND_ENABLE: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'enable.wav'),
    volume: 0.2
  },
  SOUND_ERROR: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'error.wav'),
    volume: 0.2
  },
  SOUND_PLAY: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'play.wav'),
    volume: 0.2
  },
  SOUND_STARTUP: {
    url: 'file://' + path.join(__dirname, 'static', 'sound', 'startup.wav'),
    volume: 0.4
  },

  WINDOW_ABOUT: 'file://' + path.join(__dirname, 'renderer', 'about.html'),
  WINDOW_MAIN: 'file://' + path.join(__dirname, 'renderer', 'main.html'),
  WINDOW_WEBTORRENT: 'file://' + path.join(__dirname, 'renderer', 'webtorrent.html'),

  WINDOW_MIN_HEIGHT: 38 + (120 * 2), // header height + 2 torrents
  WINDOW_MIN_WIDTH: 425
}

function isProduction () {
  if (!process.versions.electron) {
    return false
  }
  if (process.platform === 'darwin') {
    return !/\/Electron\.app\/Contents\/MacOS\/Electron$/.test(process.execPath)
  }
  if (process.platform === 'win32') {
    return !/\\electron\.exe$/.test(process.execPath)
  }
  if (process.platform === 'linux') {
    return !/\/electron$/.test(process.execPath)
  }
}
