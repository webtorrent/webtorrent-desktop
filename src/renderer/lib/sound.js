module.exports = {
  play
}

const config = require('../../config')
const { InvalidSoundNameError } = require('./errors')
const path = require('path')

const VOLUME = 0.25

/* Cache of Audio elements, for instant playback */
const cache = {}

const sounds = {
  ADD: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'add.wav'),
    volume: VOLUME
  },
  DELETE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'delete.wav'),
    volume: VOLUME * 0.5
  },
  DISABLE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'disable.wav'),
    volume: VOLUME * 0.5
  },
  DONE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'done.wav'),
    volume: VOLUME
  },
  ENABLE: {
    url: 'file://' + path.join(config.STATIC_PATH, 'sound', 'enable.wav'),
    volume: VOLUME * 0.5
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
    volume: VOLUME
  }
}

function play (name) {
  let audio = cache[name]
  if (!audio) {
    const sound = sounds[name]
    if (!sound) {
      throw new InvalidSoundNameError(name)
    }
    audio = cache[name] = new window.Audio()
    audio.volume = sound.volume
    audio.src = sound.url
  }
  audio.currentTime = 0
  audio.play()
}
