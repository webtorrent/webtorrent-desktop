module.exports = {
  preload,
  play
}

var config = require('../../config')
var path = require('path')

/* Cache of Audio elements, for instant playback */
var cache = {}

var sounds = {
  ADD: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'add.wav'),
    volume: 0.2
  },
  DELETE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'delete.wav'),
    volume: 0.1
  },
  DISABLE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'disable.wav'),
    volume: 0.2
  },
  DONE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'done.wav'),
    volume: 0.2
  },
  ENABLE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'enable.wav'),
    volume: 0.2
  },
  ERROR: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'error.wav'),
    volume: 0.2
  },
  POP: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'pop.wav'),
    volume: 0.2
  },
  PLAY: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'play.wav'),
    volume: 0.2
  },
  STARTUP: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'startup.wav'),
    volume: 0.4
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
