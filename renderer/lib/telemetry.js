// Collects anonymous usage stats and uncaught errors
// Reports back so that we can improve WebTorrent Desktop
module.exports = {
  init,
  logUncaughtError,
  logPlayAttempt
}

const crypto = require('crypto')
const electron = require('electron')
const https = require('https')
const os = require('os')
const url = require('url')

const config = require('../../config')

var telemetry

function init (state) {
  telemetry = state.saved.telemetry
  if (!telemetry) {
    telemetry = state.saved.telemetry = createSummary()
    reset()
  }

  var now = new Date()
  telemetry.timestamp = now.toISOString()
  telemetry.localTime = now.toTimeString()
  telemetry.screens = getScreenInfo()
  telemetry.system = getSystemInfo()
  telemetry.approxNumTorrents = getApproxNumTorrents(state)

  if (config.IS_PRODUCTION) {
    postToServer()
  } else {
    // Development: telemetry used only for local debugging
    // Empty uncaught errors, etc at the start of every run
    reset()
  }
}

function reset () {
  telemetry.uncaughtErrors = []
  telemetry.playAttempts = {
    total: 0,
    success: 0,
    timeout: 0,
    error: 0,
    abandoned: 0
  }
}

function postToServer () {
  // Serialize the telemetry summary
  var payload = new Buffer(JSON.stringify(telemetry), 'utf8')

  // POST to our server
  var options = url.parse(config.TELEMETRY_URL)
  options.method = 'POST'
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }

  var req = https.request(options, function (res) {
    if (res.statusCode === 200) {
      console.log('Successfully posted telemetry summary')
      reset()
    } else {
      console.error('Couldn\'t post telemetry summary, got HTTP ' + res.statusCode)
    }
  })
  req.on('error', function (e) {
    console.error('Couldn\'t post telemetry summary', e)
  })
  req.write(payload)
  req.end()
}

// Creates a new telemetry summary. Gives the user a unique ID,
// collects screen resolution, etc
function createSummary () {
  // Make a 256-bit random unique ID
  var userID = crypto.randomBytes(32).toString('hex')
  return { userID }
}

// Track screen resolution
function getScreenInfo () {
  return electron.screen.getAllDisplays().map((screen) => ({
    width: screen.size.width,
    height: screen.size.height,
    scaleFactor: screen.scaleFactor
  }))
}

// Track basic system info like OS version and amount of RAM
function getSystemInfo () {
  return {
    osPlatform: process.platform,
    osRelease: os.type() + ' ' + os.release(),
    architecture: os.arch(),
    totalMemoryMB: os.totalmem() / (1 << 20),
    numCores: os.cpus().length
  }
}

// Get the number of torrents, rounded to the nearest power of two
function getApproxNumTorrents (state) {
  var exactNum = state.saved.torrents.length
  if (exactNum === 0) return 0
  // Otherwise, return 1, 2, 4, 8, etc by rounding in log space
  var log2 = Math.log(exactNum) / Math.log(2)
  return 1 << Math.round(log2)
}

// An uncaught error happened in the main process or in one of the windows
function logUncaughtError (procName, err) {
  var message, stack
  if (typeof err === 'string') {
    message = err
    stack = ''
  } else {
    message = err.message
    stack = err.stack
  }

  // We need to POST the telemetry object, make sure it stays < 100kb
  if (telemetry.uncaughtErrors.length > 20) return
  if (message.length > 1000) message = message.substring(0, 1000)
  if (stack.length > 1000) stack = stack.substring(0, 1000)

  telemetry.uncaughtErrors.push({process: procName, message, stack})
}

// The user pressed play. It either worked, timed out, or showed the
// "Play in VLC" codec error
function logPlayAttempt (result) {
  if (!['success', 'timeout', 'error', 'abandoned'].includes(result)) {
    return console.error('Unknown play attempt result', result)
  }

  var attempts = telemetry.playAttempts
  attempts.total = (attempts.total || 0) + 1
  attempts[result] = (attempts[result] || 0) + 1
}
