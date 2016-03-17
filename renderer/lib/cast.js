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

  airplay.createBrowser().on('deviceOn', function (player) {
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
  state.devices.chromecast.on('status', handleStatus)
}

function addAirplayEvents () {}

// Update our state from the remote TV
function pollCastStatus (state) {
  var device
  if (state.playing.location === 'chromecast') device = state.devices.chromecast
  else if (state.playing.location === 'airplay') device = state.devices.airplay
  else return

  device.status(function (err, status) {
    if (err) return console.log('Error getting %s status: %o', state.playing.location, err)
    handleStatus(status)
  })
}

function handleStatus (status) {
  state.video.isCastPaused = status.playerState === 'PAUSED'
  state.video.currentTime = status.currentTime
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
  state.devices.airplay.play(state.server.networkURL, 0, function () {
    console.log('Airplay', arguments) // TODO: handle airplay errors
    state.playing.location = 'airplay'
    update()
  })
  update()
}

// Stops Chromecast or Airplay, move video back to local screen
function stopCasting () {
  if (state.playing.location === 'chromecast') {
    state.devices.chromecast.stop(stoppedCasting)
  } else if (state.playing.location === 'airplay') {
    throw new Error('Unimplemented') // TODO stop airplay
  } else if (state.playing.location.endsWith('-pending')) {
    // Connecting to Chromecast took too long or errored out. Let the user cancel
    stoppedCasting()
  }
}

function stoppedCasting () {
  state.playing.location = 'local'
  state.video.jumpToTime = state.video.currentTime
  update()
}

// Checks whether we are connected and already casting
// Returns false if we not casting (state.playing.location === 'local')
// or if we're trying to connect but haven't yet ('chromecast-pending', etc)
function isCasting () {
  return state.playing.location === 'chromecast' || state.playing.location === 'airplay'
}

function playPause () {
  var device = getActiveDevice()
  if (!state.video.isPaused) device.pause(castCallback)
  else device.play(null, null, castCallback)
}

function seek (time) {
  var device = getActiveDevice()
  device.seek(time, castCallback)
}

function getActiveDevice () {
  if (state.playing.location === 'chromecast') return state.devices.chromecast
  else if (state.playing.location === 'airplay') return state.devices.airplay
  else throw new Error('getActiveDevice() called, but we\'re not casting')
}

function castCallback () {
  console.log('Cast callback: %o', arguments)
}
