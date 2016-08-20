module.exports = {
  spawn,
  kill,
  checkInstall
}

var cp = require('child_process')
var vlcCommand = require('vlc-command')

var log = require('./log')
var windows = require('./windows')

// holds a ChildProcess while we're playing a video in an external player, null otherwise
var proc

function checkInstall (path, cb) {
  // check for VLC if external player has not been specified by the user
  // otherwise assume the player is installed
  if (path == null) return vlcCommand((err) => cb(!err))
  process.nextTick(() => cb(true))
}

function spawn (path, url, title) {
  if (path != null) return spawnExternal(path, [url])

  // Try to find and use VLC if external player is not specified
  vlcCommand(function (err, vlcPath) {
    if (err) return windows.main.dispatch('externalPlayerNotFound')
    var args = ['--play-and-exit', '--video-on-top', '--no-video-title-show', '--quiet', `--meta-title=${title}`, url]
    spawnExternal(vlcPath, args)
  })
}

function kill () {
  if (!proc) return
  log('Killing external player, pid ' + proc.pid)
  proc.kill('SIGKILL') // kill -9
  proc = null
}

function spawnExternal (path, args) {
  log('Running external media player:', path + ' ' + args.join(' '))

  proc = cp.spawn(path, args)

  // If it works, close the modal after a second
  var closeModalTimeout = setTimeout(() =>
    windows.main.dispatch('exitModal'), 1000)

  proc.on('close', function (code) {
    clearTimeout(closeModalTimeout)
    if (!proc) return // Killed
    log('External player exited with code ', code)
    if (code === 0) {
      windows.main.dispatch('backToList')
    } else {
      windows.main.dispatch('externalPlayerNotFound')
    }
    proc = null
  })

  proc.on('error', function (e) {
    log('External player error', e)
  })
}
