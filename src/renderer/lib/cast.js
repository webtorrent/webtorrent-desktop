// The Cast module talks to Airplay and Chromecast
// * Modifies state when things change
// * Starts and stops casting, provides remote video controls
module.exports = {
  init,
  toggleMenu,
  selectDevice,
  stop,
  play,
  pause,
  seek,
  setVolume,
  setRate
}

const http = require('http')

const config = require('../../config')
const { CastingError } = require('./errors')

// Lazy load these for a ~300ms improvement in startup time
let airplayer

let chromecasts
let dlnacasts

// App state. Cast modifies state.playing and state.errors in response to events
let state

// Callback to notify module users when state has changed
let update

// setInterval() for updating cast status
let statusInterval = null

// Start looking for cast devices on the local network
function init (appState, callback) {
  state = appState
  update = callback

  // Don't actually cast during integration tests
  // (Otherwise you'd need a physical Chromecast + AppleTV + DLNA TV to run them.)
  if (config.IS_TEST) {
    state.devices.chromecast = testPlayer('chromecast')
    state.devices.airplay = testPlayer('airplay')
    state.devices.dlna = testPlayer('dlna')
    return
  }

  // Load modules, scan the network for devices
  airplayer = require('airplayer')()
  chromecasts = require('chromecasts')()
  dlnacasts = require('dlnacasts')()

  state.devices.chromecast = chromecastPlayer()
  state.devices.dlna = dlnaPlayer()
  state.devices.airplay = airplayPlayer()

  // Listen for devices: Chromecast, DLNA and Airplay
  chromecasts.on('update', device => {
    // TODO: how do we tell if there are *no longer* any Chromecasts available?
    // From looking at the code, chromecasts.players only grows, never shrinks
    state.devices.chromecast.addDevice(device)
  })

  dlnacasts.on('update', device => {
    state.devices.dlna.addDevice(device)
  })

  airplayer.on('update', device => {
    state.devices.airplay.addDevice(device)
  })
}

// integration test player implementation
function testPlayer (type) {
  return {
    getDevices,
    open,
    play,
    pause,
    stop,
    status,
    seek,
    volume
  }

  function getDevices () {
    return [{ name: type + '-1' }, { name: type + '-2' }]
  }

  function open () {}
  function play () {}
  function pause () {}
  function stop () {}
  function status () {}
  function seek () {}
  function volume () {}
}

// chromecast player implementation
function chromecastPlayer () {
  const ret = {
    device: null,
    addDevice,
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

  function addDevice (device) {
    device.on('error', err => {
      if (device !== ret.device) return
      state.playing.location = 'local'
      state.errors.push({
        time: new Date().getTime(),
        message: 'Could not connect to Chromecast. ' + err.message
      })
      update()
    })
    device.on('disconnect', () => {
      if (device !== ret.device) return
      state.playing.location = 'local'
      update()
    })
  }

  function serveSubtitles (callback) {
    const subtitles = state.playing.subtitles
    const selectedSubtitle = subtitles.tracks[subtitles.selectedIndex]
    if (!selectedSubtitle) {
      callback()
    } else {
      ret.subServer = http.createServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/vtt;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Transfer-Encoding': 'chunked'
        })
        res.end(Buffer.from(selectedSubtitle.buffer.substr(21), 'base64'))
      }).listen(0, () => {
        const port = ret.subServer.address().port
        const subtitlesUrl = 'http://' + state.server.networkAddress + ':' + port + '/'
        callback(subtitlesUrl)
      })
    }
  }

  function open () {
    const torrentSummary = state.saved.torrents.find((x) => x.infoHash === state.playing.infoHash)
    serveSubtitles(subtitlesUrl => {
      ret.device.play(state.server.networkURL + '/' + state.playing.fileIndex, {
        type: 'video/mp4',
        title: config.APP_NAME + ' - ' + torrentSummary.name,
        subtitles: subtitlesUrl ? [subtitlesUrl] : [],
        autoSubtitles: !!subtitlesUrl
      }, err => {
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
    if (ret.subServer) {
      ret.subServer.close()
    }
  }

  function status () {
    ret.device.status(handleStatus)
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
  const ret = {
    device: null,
    addDevice,
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

  function addDevice (player) {
    player.on('event', event => {
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

  function getDevices () {
    return airplayer.players
  }

  function open () {
    ret.device.play(state.server.networkURL + '/' + state.playing.fileIndex, (err, res) => {
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
    ret.device.playbackInfo((err, res, status) => {
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
  const ret = {
    device: null,
    addDevice,
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

  function addDevice (device) {
    device.on('error', err => {
      if (device !== ret.device) return
      state.playing.location = 'local'
      state.errors.push({
        time: new Date().getTime(),
        message: 'Could not connect to DLNA. ' + err.message
      })
      update()
    })
    device.on('disconnect', () => {
      if (device !== ret.device) return
      state.playing.location = 'local'
      update()
    })
  }

  function open () {
    const torrentSummary = state.saved.torrents.find((x) => x.infoHash === state.playing.infoHash)
    ret.device.play(state.server.networkURL + '/' + state.playing.fileIndex, {
      type: 'video/mp4',
      title: config.APP_NAME + ' - ' + torrentSummary.name,
      seek: state.playing.currentTime > 10 ? state.playing.currentTime : 0
    }, err => {
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
    ret.device.status(handleStatus)
  }

  function seek (time, callback) {
    ret.device.seek(time, callback)
  }

  function volume (volume, callback) {
    ret.device.volume(volume, err => {
      // quick volume update
      state.playing.volume = volume
      callback(err)
    })
  }
}

function handleStatus (err, status) {
  if (err || !status) {
    return console.log('error getting %s status: %o',
      state.playing.location,
      err || 'missing response')
  }
  state.playing.isPaused = status.playerState === 'PAUSED'
  state.playing.currentTime = status.currentTime
  state.playing.volume = status.volume.muted ? 0 : status.volume.level
  update()
}

// Start polling cast device state, whenever we're connected
function startStatusInterval () {
  statusInterval = setInterval(() => {
    const player = getPlayer()
    if (player) player.status()
  }, 1000)
}

/*
 * Shows the device menu for a given cast type ('chromecast', 'airplay', etc)
 * The menu lists eg. all Chromecasts detected; the user can click one to cast.
 * If the menu was already showing for that type, hides the menu.
 */
function toggleMenu (location) {
  // If the menu is already showing, hide it
  if (state.devices.castMenu && state.devices.castMenu.location === location) {
    state.devices.castMenu = null
    return
  }

  // Never cast to two devices at the same time
  if (state.playing.location !== 'local') {
    throw new CastingError(
      `You can't connect to ${location} when already connected to another device`
    )
  }

  // Find all cast devices of the given type
  const player = getPlayer(location)
  const devices = player ? player.getDevices() : []
  if (devices.length === 0) {
    throw new CastingError(`No ${location} devices available`)
  }

  // Show a menu
  state.devices.castMenu = { location, devices }
}

function selectDevice (index) {
  const { location, devices } = state.devices.castMenu

  // Start casting
  const player = getPlayer(location)
  player.device = devices[index]
  player.open()

  // Poll the casting device's status every few seconds
  startStatusInterval()

  // Show the Connecting... screen
  state.devices.castMenu = null
  state.playing.castName = devices[index].name
  state.playing.location = location + '-pending'
  update()
}

// Stops casting, move video back to local screen
function stop () {
  const player = getPlayer()
  if (player) {
    player.stop(() => {
      player.device = null
      stoppedCasting()
    })
    clearInterval(statusInterval)
  } else {
    stoppedCasting()
  }
}

function stoppedCasting () {
  state.playing.location = 'local'
  state.playing.jumpToTime = Number.isFinite(state.playing.currentTime)
    ? state.playing.currentTime
    : 0
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
  const player = getPlayer()
  if (player) player.play(castCallback)
}

function pause () {
  const player = getPlayer()
  if (player) player.pause(castCallback)
}

function setRate (rate) {
  let player
  let result = true
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
  const player = getPlayer()
  if (player) player.seek(time, castCallback)
}

function setVolume (volume) {
  const player = getPlayer()
  if (player) player.volume(volume, castCallback)
}

function castCallback (...args) {
  console.log('%s callback: %o', state.playing.location, args)
}
