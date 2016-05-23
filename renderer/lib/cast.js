// The Cast module talks to Airplay and Chromecast
// * Modifies state when things change
// * Starts and stops casting, provides remote video controls
module.exports = {
  init,
  open,
  close,
  play,
  pause,
  seek,
  setVolume,
  setRate,
  selectDevice
}

var airplayer = require('airplayer')()
var chromecasts = require('chromecasts')()
var dlnacasts = require('dlnacasts')()

var config = require('../../config')

// App state. Cast modifies state.playing and state.errors in response to events
var state

// Callback to notify module users when state has changed
var update

// setInterval() for updating cast status
var statusInterval = null

// Start looking for cast devices on the local network
function init (appState, callback) {
  state = appState
  update = callback

  // Listen for devices: Chromecast, DLNA and Airplay
  chromecasts.on('update', function () {
    // TODO: how do we tell if there are *no longer* any Chromecasts available?
    // From looking at the code, chromecasts.players only grows, never shrinks
    if (!state.devices.chromecast) state.devices.chromecast = chromecastPlayer()
  })

  dlnacasts.on('update', function () {
    if (!state.devices.dlna) state.devices.dlna = dlnaPlayer()
  })

  airplayer.on('update', function (player) {
    if (!state.devices.airplay) state.devices.airplay = airplayPlayer(player)
  })
}

// chromecast player implementation
function chromecastPlayer () {
  var ret = {
    device: null,
    addEvents,
    getDevices,
    open,
    play,
    pause,
    stop,
    status,
    seek,
    volume
  }
  return ret

  function getDevices () {
    return chromecasts.players
  }

  function addEvents () {
    ret.device.on('error', function (err) {
      state.playing.location = 'local'
      state.errors.push({
        time: new Date().getTime(),
        message: 'Could not connect to Chromecast. ' + err.message
      })
      update()
    })
    ret.device.on('disconnect', function () {
      state.playing.location = 'local'
      update()
    })
  }

  function open () {
    var torrentSummary = state.saved.torrents.find((x) => x.infoHash === state.playing.infoHash)
    ret.device.play(state.server.networkURL, {
      type: 'video/mp4',
      title: config.APP_NAME + ' - ' + torrentSummary.name
    }, function (err) {
      if (err) {
        state.playing.location = 'local'
        state.errors.push({
          time: new Date().getTime(),
          message: 'Could not connect to Chromecast. ' + err.message
        })
      } else {
        state.playing.location = 'chromecast'
      }
      update()
    })
  }

  function play (callback) {
    ret.device.play(null, null, callback)
  }

  function pause (callback) {
    ret.device.pause(callback)
  }

  function stop (callback) {
    ret.device.stop(callback)
  }

  function status () {
    ret.device.status(function (err, status) {
      if (err) return console.log('error getting %s status: %o', state.playing.location, err)
      state.playing.isPaused = status.playerState === 'PAUSED'
      state.playing.currentTime = status.currentTime
      state.playing.volume = status.volume.muted ? 0 : status.volume.level
      update()
    })
  }

  function seek (time, callback) {
    ret.device.seek(time, callback)
  }

  function volume (volume, callback) {
    ret.device.volume(volume, callback)
  }
}

// airplay player implementation
function airplayPlayer () {
  var ret = {
    device: null,
    addEvents,
    getDevices,
    open,
    play,
    pause,
    stop,
    status,
    seek,
    volume
  }
  return ret

  function getDevices () {
    return airplay.players
  }

  function addEvents () {
    ret.device.on('event', function (event) {
      switch (event.state) {
        case 'loading':
          break
        case 'playing':
          state.playing.isPaused = false
          break
        case 'paused':
          state.playing.isPaused = true
          break
        case 'stopped':
          break
      }
      update()
    })
  }

  function open () {
    ret.device.play(state.server.networkURL, function (err, res) {
      if (err) {
        state.playing.location = 'local'
        state.errors.push({
          time: new Date().getTime(),
          message: 'Could not connect to AirPlay. ' + err.message
        })
      } else {
        state.playing.location = 'airplay'
      }
      update()
    })
  }

  function play (callback) {
    ret.device.resume(callback)
  }

  function pause (callback) {
    ret.device.pause(callback)
  }

  function stop (callback) {
    ret.device.stop(callback)
  }

  function status () {
    ret.device.playbackInfo(function (err, res, status) {
      if (err) {
        state.playing.location = 'local'
        state.errors.push({
          time: new Date().getTime(),
          message: 'Could not connect to AirPlay. ' + err.message
        })
      } else {
        state.playing.isPaused = status.rate === 0
        state.playing.currentTime = status.position
        update()
      }
    })
  }

  function seek (time, callback) {
    ret.device.scrub(time, callback)
  }

  function volume (volume, callback) {
    // AirPlay doesn't support volume
    // TODO: We should just disable the volume slider
    state.playing.volume = volume
  }
}

// DLNA player implementation
function dlnaPlayer (player) {
  var ret = {
    device: null,
    addEvents,
    getDevices,
    open,
    play,
    pause,
    stop,
    status,
    seek,
    volume
  }
  return ret

  function getDevices () {
    return dlnacasts.players
  }

  function addEvents () {
    ret.device.on('error', function (err) {
      state.playing.location = 'local'
      state.errors.push({
        time: new Date().getTime(),
        message: 'Could not connect to DLNA. ' + err.message
      })
      update()
    })
    ret.device.on('disconnect', function () {
      state.playing.location = 'local'
      update()
    })
  }

  function open () {
    var torrentSummary = state.saved.torrents.find((x) => x.infoHash === state.playing.infoHash)
    ret.device.play(state.server.networkURL, {
      type: 'video/mp4',
      title: config.APP_NAME + ' - ' + torrentSummary.name,
      seek: state.playing.currentTime > 10 ? state.playing.currentTime : 0
    }, function (err) {
      if (err) {
        state.playing.location = 'local'
        state.errors.push({
          time: new Date().getTime(),
          message: 'Could not connect to DLNA. ' + err.message
        })
      } else {
        state.playing.location = 'dlna'
      }
      update()
    })
  }

  function play (callback) {
    ret.device.play(null, null, callback)
  }

  function pause (callback) {
    ret.device.pause(callback)
  }

  function stop (callback) {
    ret.device.stop(callback)
  }

  function status () {
    ret.device.status(function (err, status) {
      if (err) return console.log('error getting %s status: %o', state.playing.location, err)
      state.playing.isPaused = status.playerState === 'PAUSED'
      state.playing.currentTime = status.currentTime
      state.playing.volume = status.volume.level
      update()
    })
  }

  function seek (time, callback) {
    ret.device.seek(time, callback)
  }

  function volume (volume, callback) {
    ret.device.volume(volume, function (err) {
      // quick volume update
      state.playing.volume = volume
      callback(err)
    })
  }
}

// Start polling cast device state, whenever we're connected
function startStatusInterval () {
  statusInterval = setInterval(function () {
    var player = getPlayer()
    if (player) player.status()
  }, 1000)
}

function open (location) {
  if (state.playing.location !== 'local') {
    throw new Error('You can\'t connect to ' + location + ' when already connected to another device')
  }

  var player = getPlayer(location)
  var devices = player ? player.getDevices() : []
  if (devices.length === 0) throw new Error('No ' + location + ' devices available')

  // Show a menu
  state.devices.castMenu = {location, devices}

  /* if (devices.length === 1) {
    // Start casting to the only available Chromecast, Airplay, or DNLA device
    openDevice(location, devices[0])
  } else {
    // Show a menu
  } */
}

function selectDevice (index) {
  var {location, devices} = state.devices.castMenu

  // Start casting
  var player = getPlayer(location)
  player.device = devices[index]
  player.open()

  // Poll the casting device's status every few seconds
  startStatusInterval()

  // Show the Connecting... screen
  state.devices.castMenu = null
  state.playing.location = location + '-pending'
  update()
}

// Stops casting, move video back to local screen
function close () {
  var player = getPlayer()
  if (player) {
    player.stop(stoppedCasting)
    clearInterval(statusInterval)
  } else {
    stoppedCasting()
  }
}

function stoppedCasting () {
  state.playing.location = 'local'
  state.playing.jumpToTime = state.playing.currentTime
  update()
}

function getPlayer (location) {
  if (location) {
    return state.devices[location]
  } else if (state.playing.location === 'chromecast') {
    return state.devices.chromecast
  } else if (state.playing.location === 'airplay') {
    return state.devices.airplay
  } else if (state.playing.location === 'dlna') {
    return state.devices.dlna
  } else {
    return null
  }
}

function play () {
  var player = getPlayer()
  if (player) player.play(castCallback)
}

function pause () {
  var player = getPlayer()
  if (player) player.pause(castCallback)
}

function setRate (rate) {
  var player
  var result = true
  if (state.playing.location === 'chromecast') {
    // TODO find how to control playback rate on chromecast
    castCallback()
    result = false
  } else if (state.playing.location === 'airplay') {
    player = state.devices.airplay
    player.rate(rate, castCallback)
  } else {
    result = false
  }
  return result
}

function seek (time) {
  var player = getPlayer()
  if (player) player.seek(time, castCallback)
}

function setVolume (volume) {
  var player = getPlayer()
  if (player) player.volume(volume, castCallback)
}

function castCallback () {
  console.log('%s callback: %o', state.playing.location, arguments)
}
