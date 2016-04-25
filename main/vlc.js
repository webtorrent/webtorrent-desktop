module.exports = {
  getInstalledVersion,
  spawn
}

var cp = require('child_process')
var fs = require('fs')
var path = require('path')

// Runs vlc --version. Calls back with the currently installed version of VLC
// or null if VLC is not installed. (Or 'unknown' if VLC runs and produces bad
// output, but that should never happen.)
function getInstalledVersion (cb) {
  exec(['--version'], function (e, stdout, stderr) {
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

// TODO: make this its own module, to avoid duplicating code with webtorrent-cli
// Finds if VLC is installed on Mac, Windows, or Linux and runs it
function exec (args, cb) {
  execOrSpawn(args, true, cb)
}

// Finds if VLC is installed on Mac, Windows, or Linux.
// Uses child_process.spawn() to return a ChildProcess object
// Calls back with (err, childProcess)
function spawn (args, cb) {
  execOrSpawn(args, false, cb)
}

function execOrSpawn (args, isExec, cb) {
  if (process.platform === 'win32') {
    var Registry = require('winreg')

    var key
    if (process.arch === 'x64') {
      key = new Registry({
        hive: Registry.HKLM,
        key: '\\Software\\Wow6432Node\\VideoLAN\\VLC'
      })
    } else {
      key = new Registry({
        hive: Registry.HKLM,
        key: '\\Software\\VideoLAN\\VLC'
      })
    }

    key.get('InstallDir', function (err, item) {
      if (err) return cb(err)
      var vlcPath = item.value + path.sep + 'vlc'
      if (isExec) cp.execFile(vlcPath, args, cb)
      else cb(null, cp.spawn(vlcPath, args))
    })
  } else {
    var macRoot = '/Applications/VLC.app/Contents/MacOS/VLC'
    var macHome = (process.env.HOME || '') + root
    var locations = [macRoot, macHome, '/usr/bin/vlc']
    var found = false
    var failed = 0
    locations.forEach(function (loc) {
      fs.stat(loc, function (err) {
        if (err) {
          if (++failed === locations.length) cb(new Error('Can\'t find VLC'))
          return
        }
        if (found) return
        found = true
        if (isExec) cp.execFile(loc, args, cb)
        else cb(null, cp.spawn(loc, args))
      })
    })
  }
}
