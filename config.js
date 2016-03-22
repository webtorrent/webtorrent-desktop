var applicationConfigPath = require('application-config-path')
var path = require('path')

var APP_VERSION = require('./package.json').version

module.exports = {
  APP_COPYRIGHT: 'Copyright © 2014-2016 The WebTorrent Project',
  APP_FILE_ICON: path.join(__dirname, 'static', 'WebTorrentFile'),
  APP_ICON: path.join(__dirname, 'static', 'WebTorrent'),
  APP_NAME: 'WebTorrent',

  AUTO_UPDATE_URL: 'https://webtorrent.io/app/updates?version=' + APP_VERSION,
  AUTO_UPDATE_CHECK_STARTUP_DELAY: 60 * 1000 /* 1 minute */,

  CONFIG_PATH: applicationConfigPath('WebTorrent'),
  CONFIG_POSTER_PATH: path.join(applicationConfigPath('WebTorrent'), 'Posters'),
  CONFIG_TORRENT_PATH: path.join(applicationConfigPath('WebTorrent'), 'Torrents'),

  INDEX: 'file://' + path.join(__dirname, 'renderer', 'index.html'),

  IS_PRODUCTION: isProduction(),

  ROOT_PATH: __dirname,
  STATIC_PATH: path.join(__dirname, 'static'),

  SOUND_ADD: 'file://' + path.join(__dirname, 'static', 'sound', 'add.wav'),
  SOUND_DELETE: 'file://' + path.join(__dirname, 'static', 'sound', 'delete.wav'),
  SOUND_DISABLE: 'file://' + path.join(__dirname, 'static', 'sound', 'disable.wav'),
  SOUND_DONE: 'file://' + path.join(__dirname, 'static', 'sound', 'done.wav'),
  SOUND_ENABLE: 'file://' + path.join(__dirname, 'static', 'sound', 'enable.wav'),
  SOUND_ERROR: 'file://' + path.join(__dirname, 'static', 'sound', 'error.wav'),
  SOUND_PLAY: 'file://' + path.join(__dirname, 'static', 'sound', 'play.wav'),
  SOUND_STARTUP: 'file://' + path.join(__dirname, 'static', 'sound', 'startup.wav')
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
