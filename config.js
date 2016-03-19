var applicationConfigPath = require('application-config-path')
var path = require('path')

module.exports = {
  APP_ICON: path.join(__dirname, 'static', 'WebTorrent.png'),
  APP_NAME: 'WebTorrent',

  CONFIG_PATH: applicationConfigPath('WebTorrent'),
  CONFIG_POSTER_PATH: path.join(applicationConfigPath('WebTorrent'), 'posters'),

  INDEX: 'file://' + path.join(__dirname, 'renderer', 'index.html'),

  SOUND_ADD: 'file://' + path.join(__dirname, 'static', 'sound', 'add.wav'),
  SOUND_DELETE: 'file://' + path.join(__dirname, 'static', 'sound', 'delete.wav'),
  SOUND_DISABLE: 'file://' + path.join(__dirname, 'static', 'sound', 'disable.wav'),
  SOUND_DONE: 'file://' + path.join(__dirname, 'static', 'sound', 'done.wav'),
  SOUND_ENABLE: 'file://' + path.join(__dirname, 'static', 'sound', 'enable.wav'),
  SOUND_ERROR: 'file://' + path.join(__dirname, 'static', 'sound', 'error.wav'),
  SOUND_PLAY: 'file://' + path.join(__dirname, 'static', 'sound', 'play.wav'),
  SOUND_STARTUP: 'file://' + path.join(__dirname, 'static', 'sound', 'startup.wav')
}
