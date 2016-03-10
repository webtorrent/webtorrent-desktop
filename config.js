var path = require('path')

module.exports = {
  APP_NAME: 'WebTorrent',
  APP_ICON: path.join(__dirname, 'WebTorrent.png'),
  INDEX: 'file://' + path.join(__dirname, 'renderer', 'index.html'),
  SOUND_ADD: 'file://' + path.join(__dirname, 'resources', 'sound', 'add.wav'),
  SOUND_DELETE: 'file://' + path.join(__dirname, 'resources', 'sound', 'delete.wav'),
  SOUND_DISABLE: 'file://' + path.join(__dirname, 'resources', 'sound', 'disable.wav'),
  SOUND_DONE: 'file://' + path.join(__dirname, 'resources', 'sound', 'done.wav'),
  SOUND_ENABLE: 'file://' + path.join(__dirname, 'resources', 'sound', 'enable.wav'),
  SOUND_ERROR: 'file://' + path.join(__dirname, 'resources', 'sound', 'error.wav'),
  SOUND_PLAY: 'file://' + path.join(__dirname, 'resources', 'sound', 'play.wav'),
  SOUND_STARTUP: 'file://' + path.join(__dirname, 'resources', 'sound', 'startup.wav')
}
