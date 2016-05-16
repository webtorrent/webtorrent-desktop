module.exports = {
  checkForVLC,
  spawn
}

var cp = require('child_process')
var vlcCommand = require('vlc-command')

// Finds if VLC is installed on Mac, Windows, or Linux.
// Calls back with true or false: whether VLC was detected
function checkForVLC (cb) {
  vlcCommand((err) => cb(!err))
}

// Spawns VLC with child_process.spawn() to return a ChildProcess object
// Calls back with (err, childProcess)
function spawn (args, cb) {
  vlcCommand(function (err, vlcPath) {
    if (err) return cb(err)
    cb(null, cp.spawn(vlcPath, args))
  })
}
