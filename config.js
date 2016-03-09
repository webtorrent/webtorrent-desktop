var path = require('path')

module.exports = {
  APP_NAME: 'WebTorrent',
  INDEX: 'file://' + path.resolve(__dirname, 'renderer', 'index.html'),
  SOUND_ADD: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'add.wav'),
  SOUND_DELETE: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'delete.wav'),
  SOUND_DISABLE: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'disable.wav'),
  SOUND_DONE: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'done.wav'),
  SOUND_ENABLE: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'enable.wav'),
  SOUND_ERROR: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'error.wav'),
  SOUND_PLAY: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'play.wav'),
  SOUND_STARTUP: 'file://' + path.resolve(__dirname, 'resources', 'sound', 'startup.wav')
}
