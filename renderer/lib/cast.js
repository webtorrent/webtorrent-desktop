var chromecasts = require('chromecasts')()
var airplay = require('airplay-js')

var config = require('../../config')
var state = require('../state')

// The Cast module talks to Airplay and Chromecast
// * Modifies state when things change
// * Starts and stops casting, provides remote video controls
module.exports = {
  init,
  openChromecast,
  openAirplay,
  stopCasting,
  playPause,
  seek,
  setVolume,
  isCasting
}

// Callback to notify module users when state has changed
var update

function init (callback) {
  update = callback

  // Start polling Chromecast or Airplay, whenever we're connected
  setInterval(() => pollCastStatus(state), 1000)

  // Listen for devices: Chromecast and Airplay
  chromecasts.on('update', function (player) {
    state.devices.chromecast = player
    addChromecastEvents()
  })

  var browser = airplay.createBrowser()
  browser.on('deviceOn', function (player) {
    state.devices.airplay = player
    addAirplayEvents()
  }).start()
}

function addChromecastEvents () {
  state.devices.chromecast.on('error', function (err) {
    state.devices.chromecast.errorMessage = err.message
    update()
  })
  state.devices.chromecast.on('disconnect', function () {
    state.playing.location = 'local'
    update()
  })
}

function addAirplayEvents () {}

// Update our state from the remote TV
function pollCastStatus (state) {
  if (state.playing.location === 'chromecast') {
    state.devices.chromecast.status(function (err, status) {
      if (err) return console.log('Error getting %s status: %o', state.playing.location, err)
      state.playing.isPaused = status.playerState === 'PAUSED'
      state.playing.currentTime = status.currentTime
      state.playing.volume = status.volume.muted ? 0 : status.volume.level
      update()
    })
  } else if (state.playing.location === 'airplay') {
    state.devices.airplay.status(function (status) {
      state.playing.isPaused = status.rate === 0
      state.playing.currentTime = status.position
      // TODO: get airplay volume, implementation needed. meanwhile set value in setVolume
      // According to docs is in [-30 - 0] (db) range
      // should be converted to [0 - 1] using (val / 30 + 1)
      update()
    })
  }
}

function openChromecast () {
  if (state.playing.location !== 'local') {
    throw new Error('You can\'t connect to Chromecast when already connected to another device')
  }

  state.playing.location = 'chromecast-pending'
  var torrentSummary = state.saved.torrents.find((x) => x.infoHash === state.playing.infoHash)
  state.devices.chromecast.play(state.server.networkURL, {
    type: 'video/mp4',
    title: config.APP_NAME + ' — ' + torrentSummary.name
  }, function (err) {
    state.playing.location = err ? 'local' : 'chromecast'
    update()
  })
  update()
}

function openAirplay () {
  if (state.playing.location !== 'local') {
    throw new Error('You can\'t connect to Airplay when already connected to another device')
  }

  state.playing.location = 'airplay-pending'
  state.devices.airplay.play(state.server.networkURL, 0, function (res) {
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
  update()
}

// Stops Chromecast or Airplay, move video back to local screen
function stopCasting () {
  if (state.playing.location === 'chromecast') {
    state.devices.chromecast.stop(stoppedCasting)
  } else if (state.playing.location === 'airplay') {
    state.devices.airplay.stop(stoppedCasting)
  } else if (state.playing.location.endsWith('-pending')) {
    // Connecting to Chromecast took too long or errored out. Let the user cancel
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

function playPause () {
  var device
  if (state.playing.location === 'chromecast') {
    device = state.devices.chromecast
    if (!state.playing.isPaused) device.pause(castCallback)
    else device.play(null, null, castCallback)
  } else if (state.playing.location === 'airplay') {
    device = state.devices.airplay
    if (!state.playing.isPaused) device.rate(0, castCallback)
    else device.rate(1, castCallback)
  }
}

function seek (time) {
  if (state.playing.location === 'chromecast') {
    state.devices.chromecast.seek(time, castCallback)
  } else if (state.playing.location === 'airplay') {
    state.devices.airplay.scrub(time, castCallback)
  }
}

function setVolume (volume) {
  if (state.playing.location === 'chromecast') {
    state.devices.chromecast.volume(volume, castCallback)
  } else if (state.playing.location === 'airplay') {
    // TODO remove line below once we can fetch the information in status update
    state.playing.volume = volume
    volume = (volume - 1) * 30
    state.devices.airplay.volume(volume, castCallback)
  }
}

function castCallback () {
  console.log(state.playing.location + ' callback: %o', arguments)
}
