module.exports = {
  getInstalledVersion,
  spawn
}

var cp = require('child_process')
var vlcCommand = require('vlc-command')

// Runs vlc --version. Calls back with the currently installed version of VLC
// or null if VLC is not installed. (Or 'unknown' if VLC runs and produces bad
// output, but that should never happen.)
function getInstalledVersion (cb) {
  exec(['--version'], function (e, stdout) {
    var version
    if (e) {
      version = null
    } else {
      // Prints several lines, starting with eg: VLC media player 2.7.0
      if (!stdout.startsWith('VLC media player')) version = 'unknown'
      else version = stdout.split(' ')[3]
    }
    cb(version)
  })
}

function exec (args, cb) {
  vlcCommand(function (err, vlcPath) {
    if (err) return cb(err)
    cp.execFile(vlcPath, args, cb)
  })
}

// Finds if VLC is installed on Mac, Windows, or Linux.
// Uses child_process.spawn() to return a ChildProcess object
// Calls back with (err, childProcess)
function spawn (args, cb) {
  vlcCommand(function (err, vlcPath) {
    if (err) return cb(err)
    cb(null, cp.spawn(vlcPath, args))
  })
}
