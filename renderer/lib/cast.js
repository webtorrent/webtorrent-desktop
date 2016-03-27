var chromecasts = require('chromecasts')()
var airplay = require('airplay-js')

var config = require('../../config')
var state = require('../state')

var debug = require('debug')('webtorrent-app:cast')

// The Cast module talks to Airplay and Chromecast
// * Modifies state when things change
// * Starts and stops casting, provides remote video controls
module.exports = {
  init,
  open,
  stopCasting,
  playPause,
  seek,
  setVolume,
  isCasting
}

// Callback to notify module users when state has changed
var update

// chromecast player implementation
function chromecastPlayer (player) {
  function addEvents () {
    player.on('error', function (err) {
      player.errorMessage = err.message
      update()
    })
    player.on('disconnect', function () {
      state.playing.location = 'local'
      update()
    })
  }

  function open () {
    var torrentSummary = state.saved.torrents.find((x) => x.infoHash === state.playing.infoHash)
    player.play(state.server.networkURL, {
      type: 'video/mp4',
      title: config.APP_NAME + ' — ' + torrentSummary.name
    }, function (err) {
      if (err) {
        state.playing.location = 'local'
      } else {
        state.playing.location = 'chromecast'
      }
      update()
    })
  }

  function playPause (callback) {
    if (!state.playing.isPaused) player.pause(callback)
    else player.play(null, null, callback)
  }

  function stop (callback) {
    player.stop(callback)
  }

  function status (state) {
    player.status(function (err, status) {
      if (err) return debug('error getting %s status: %o', state.playing.location, err)
      state.playing.isPaused = status.playerState === 'PAUSED'
      state.playing.currentTime = status.currentTime
      state.playing.volume = status.volume.muted ? 0 : status.volume.level
      update()
    })
  }

  function seek (time, callback) {
    player.seek(time, callback)
  }

  function volume (volume, callback) {
    player.volume(volume, callback)
  }

  addEvents()

  return {
    player: player,
    open: open,
    playPause: playPause,
    stop: stop,
    status: status,
    seek: seek,
    volume: volume
  }
}

// airplay player implementation
function airplayPlayer (player) {
  function open () {
    player.play(state.server.networkURL, 0, function (res) {
      if (res.statusCode !== 200) {
        state.playing.location = 'local'
        state.errors.push({
          time: new Date().getTime(),
          message: 'Couldn\'t connect to Airplay'
        })
      } else {
        state.playing.location = 'airplay'
      }
      update()
    })
  }

  function playPause (callback) {
    if (!state.playing.isPaused) player.rate(0, callback)
    else player.rate(1, callback)
  }

  function stop (callback) {
    player.stop(callback)
  }

  function status (state) {
    player.status(function (status) {
      state.playing.isPaused = status.rate === 0
      state.playing.currentTime = status.position
      // TODO: get airplay volume, implementation needed. meanwhile set value in setVolume
      // According to docs is in [-30 - 0] (db) range
      // should be converted to [0 - 1] using (val / 30 + 1)
      update()
    })
  }

  function seek (time, callback) {
    player.scrub(time, callback)
  }

  function volume (volume, callback) {
    // TODO remove line below once we can fetch the information in status update
    state.playing.volume = volume
    volume = (volume - 1) * 30
    player.volume(volume, callback)
  }

  return {
    player: player,
    open: open,
    playPause: playPause,
    stop: stop,
    status: status,
    seek: seek,
    volume: volume
  }
}

// start export functions
function init (callback) {
  update = callback


  // Start polling Chromecast or Airplay, whenever we're connected
  setInterval(() => pollCastStatus(state), 1000)

  // Listen for devices: Chromecast and Airplay
  chromecasts.on('update', function (player) {
    state.devices.chromecast = chromecastPlayer(player)
  })

  var browser = airplay.createBrowser()
  browser.on('deviceOn', function (player) {
    debug('airplay found')
    state.devices.airplay = airplayPlayer(player)
  }).start()
}

// Update our state from the remote TV
function pollCastStatus (state) {
  var device = getDevice()
  if (device) {
    device.status(state)
  }
}

function open (location) {
  if (state.playing.location !== 'local') {
    throw new Error('You can\'t connect to ' + location + ' when already connected to another device')
  }

  state.playing.location = location + '-pending'
  var device = getDevice(location)
  if (device) {
    getDevice(location).open()
  }

  update()
}

// Stops Chromecast or Airplay, move video back to local screen
function stopCasting () {
  var device = getDevice()
  if (device) {
    device.stop(stoppedCasting)
  } else {
    stoppedCasting()
  }
}

function stoppedCasting () {
  state.playing.location = 'local'
  state.playing.jumpToTime = state.playing.currentTime
  update()
}

// Checks whether we are connected and already casting
// Returns false if we not casting (state.playing.location === 'local')
// or if we're trying to connect but haven't yet ('chromecast-pending', etc)
function isCasting () {
  return state.playing.location === 'chromecast' || state.playing.location === 'airplay'
}

function getDevice (location) {
  if (location && state.devices[location]) {
    return state.devices[location]
  } else if (state.playing.location === 'chromecast') {
    return state.devices.chromecast
  } else if (state.playing.location === 'airplay') {
    return state.devices.airplay
  }
}

function playPause () {
  var device = getDevice()
  if (device) {
    device.playPause(castCallback)
  }
}

function seek (time) {
  var device = getDevice()
  if (device) {
    device.seek(time, castCallback)
  }
}

function setVolume (volume) {
  var device = getDevice()
  if (device) {
    device.volume(volume, castCallback)
  }
}

function castCallback () {
  debug('%s callback: %o', state.playing.location, arguments)
}
