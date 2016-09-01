module.exports = {
  preload,
  play
}

var config = require('../../config')
var path = require('path')
const prefs = require('./prefs')

var VOLUME = 0.15

/* Cache of Audio elements, for instant playback */
var cache = {}

var sounds = {
  ADD: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'add.wav'),
    volume: VOLUME
  },
  DELETE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'delete.wav'),
    volume: VOLUME
  },
  DISABLE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'disable.wav'),
    volume: VOLUME
  },
  DONE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'done.wav'),
    volume: VOLUME
  },
  ENABLE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'enable.wav'),
    volume: VOLUME
  },
  ERROR: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'error.wav'),
    volume: VOLUME
  },
  PLAY: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'play.wav'),
    volume: VOLUME
  },
  STARTUP: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'startup.wav'),
    volume: VOLUME * 2
  }
}

function preload () {
  for (var name in sounds) {
    if (!cache[name]) {
      var sound = sounds[name]
      var audio = cache[name] = new window.Audio()
      audio.volume = sound.volume
      audio.src = sound.url
    }
  }
}

function play (name) {
  if (prefs.current.systemSounds) {
    var audio = cache[name]

    if (!audio) {
      var sound = sounds[name]
      if (!sound) {
        throw new Error('Invalid sound name')
      }
      audio = cache[name] = new window.Audio()
      audio.volume = sound.volume
      audio.src = sound.url
    }

    audio.currentTime = 0
    audio.play()
  }
}
