// Collects anonymous usage stats and uncaught errors
// Reports back so that we can improve WebTorrent Desktop
module.exports = {
  init,
  send,
  logUncaughtError,
  logPlayAttempt
}

const electron = require('electron')

const config = require('../../config')

let telemetry

function init (state) {
  if (!state.saved.telemetry) {
    const crypto = require('crypto')
    state.saved.telemetry = {
      userID: crypto.randomBytes(32).toString('hex') // 256-bit random ID
    }
    reset()
  }
  telemetry = state.saved.telemetry
}

function send (state) {
  const now = new Date()
  telemetry.version = config.APP_VERSION
  telemetry.timestamp = now.toISOString()
  telemetry.localTime = now.toTimeString()
  telemetry.screens = getScreenInfo()
  telemetry.system = getSystemInfo()
  telemetry.torrentStats = getTorrentStats(state)
  telemetry.approxNumTorrents = telemetry.torrentStats.approxCount

  if (!config.IS_PRODUCTION) {
    // Development: telemetry used only for local debugging
    // Empty uncaught errors, etc at the start of every run
    return reset()
  }

  const get = require('simple-get')

  const opts = {
    url: config.TELEMETRY_URL,
    method: 'POST',
    body: telemetry,
    json: true
  }

  get(opts, function (err, res) {
    if (err) return console.error('Error sending telemetry', err)
    if (res.statusCode !== 200) {
      return console.error(`Error sending telemetry, status code: ${res.statusCode}`)
    }
    console.log('Sent telemetry')
    reset()
  })
}

function reset () {
  telemetry.uncaughtErrors = []
  telemetry.playAttempts = {
    minVersion: config.APP_VERSION,
    total: 0,
    success: 0,
    timeout: 0,
    error: 0,
    abandoned: 0
  }
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
  const os = require('os')
  return {
    osPlatform: process.platform,
    osRelease: os.type() + ' ' + os.release(),
    architecture: os.arch(),
    systemArchitecture: config.OS_SYSARCH,
    totalMemoryMB: roundPow2(os.totalmem() / (1 << 20)),
    numCores: os.cpus().length
  }
}

// Get stats like the # of torrents currently active, # in list, total size
function getTorrentStats (state) {
  const count = state.saved.torrents.length
  let sizeMB = 0
  let byStatus = {
    new: { count: 0, sizeMB: 0 },
    downloading: { count: 0, sizeMB: 0 },
    seeding: { count: 0, sizeMB: 0 },
    paused: { count: 0, sizeMB: 0 }
  }

  // First, count torrents & total file size
  for (let i = 0; i < count; i++) {
    const t = state.saved.torrents[i]
    const stat = byStatus[t.status]
    if (!t || !t.files || !stat) continue
    stat.count++
    for (let j = 0; j < t.files.length; j++) {
      const f = t.files[j]
      if (!f || !f.length) continue
      const fileSizeMB = f.length / (1 << 20)
      sizeMB += fileSizeMB
      stat.sizeMB += fileSizeMB
    }
  }

  // Then, round all the counts and sums to the nearest power of 2
  const ret = roundTorrentStats({count, sizeMB})
  ret.byStatus = {
    new: roundTorrentStats(byStatus.new),
    downloading: roundTorrentStats(byStatus.downloading),
    seeding: roundTorrentStats(byStatus.seeding),
    paused: roundTorrentStats(byStatus.paused)
  }
  return ret
}

function roundTorrentStats (stats) {
  return {
    approxCount: roundPow2(stats.count),
    approxSizeMB: roundPow2(stats.sizeMB)
  }
}

// Rounds to the nearest power of 2, for privacy and easy bucketing.
// Rounds 35 to 32, 70 to 64, 5 to 4, 1 to 1, 0 to 0.
// Supports nonnegative numbers only.
function roundPow2 (n) {
  if (n <= 0) return 0
  // Otherwise, return 1, 2, 4, 8, etc by rounding in log space
  const log2 = Math.log(n) / Math.log(2)
  return Math.pow(2, Math.round(log2))
}

// An uncaught error happened in the main process or in one of the windows
function logUncaughtError (procName, e) {
  // Not initialized yet? Ignore.
  // Hopefully uncaught errors immediately on startup are fixed in dev
  if (!telemetry) return

  let message
  let stack = ''
  if (e == null) {
    message = 'Unexpected undefined error'
  } else if (e.error) {
    // Uncaught Javascript errors (window.onerror), err is an ErrorEvent
    if (!e.error.message) {
      message = 'Unexpected ErrorEvent.error: ' + Object.keys(e.error).join(' ')
    } else {
      message = e.error.message
      stack = e.error.stack
    }
  } else if (e.message) {
    // err is either an Error or a plain object {message, stack}
    message = e.message
    stack = e.stack
  } else {
    // Resource errors (captured element.onerror), err is an Event
    if (!e.target) {
      message = 'Unexpected unknown error'
    } else if (!e.target.error) {
      message = 'Unexpected resource loading error: ' + getElemString(e.target)
    } else {
      message = 'Resource error ' + getElemString(e.target) + ': ' + e.target.error.code
    }
  }

  if (typeof stack !== 'string') stack = 'Unexpected stack: ' + stack
  if (typeof message !== 'string') message = 'Unexpected message: ' + message

  // Remove the first part of each file path in the stack trace.
  // - Privacy: remove personal info like C:\Users\<full name>
  // - Aggregation: this lets us find which stacktraces occur often
  stack = stack.replace(/\(.*app.asar/g, '(...')
  stack = stack.replace(/at .*app.asar/g, 'at ...')

  // We need to POST the telemetry object, make sure it stays < 100kb
  if (telemetry.uncaughtErrors.length > 20) return
  if (message.length > 1000) message = message.substring(0, 1000)
  if (stack.length > 1000) stack = stack.substring(0, 1000)

  // Log the app version *at the time of the error*
  const version = config.APP_VERSION

  telemetry.uncaughtErrors.push({process: procName, message, stack, version})
}

// Turns a DOM element into a string, eg "DIV.my-class.visible"
function getElemString (elem) {
  let ret = elem.tagName
  try {
    ret += '.' + Array.from(elem.classList).join('.')
  } catch (err) {}
  return ret
}

// The user pressed play. It either worked, timed out, or showed the
// 'Play in VLC' codec error
function logPlayAttempt (result) {
  if (!['success', 'timeout', 'error', 'abandoned'].includes(result)) {
    return console.error('Unknown play attempt result', result)
  }

  const attempts = telemetry.playAttempts
  attempts.total = (attempts.total || 0) + 1
  attempts[result] = (attempts[result] || 0) + 1
}
