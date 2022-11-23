module.exports = {
  spawn,
  kill,
  checkInstall
}

const cp = require('child_process')
const path = require('path')
const vlcCommand = require('vlc-command')

const log = require('./log')
const windows = require('./windows')

// holds a ChildProcess while we're playing a video in an external player, null otherwise
let proc = null

function checkInstall (playerPath, cb) {
  // check for VLC if external player has not been specified by the user
  // otherwise assume the player is installed
  if (!playerPath) return vlcCommand(cb)
  process.nextTick(() => cb(null))
}

function spawn (playerPath, url, title) {
  if (playerPath) return spawnExternal(playerPath, [url])

  // Try to find and use VLC if external player is not specified
  vlcCommand((err, vlcPath) => {
    if (err) return windows.main.dispatch('externalPlayerNotFound')
    const args = [
      '--play-and-exit',
      '--quiet',
      `--meta-title=${JSON.stringify(title)}`,
      url
    ]
    spawnExternal(vlcPath, args)
  })
}

function kill () {
  if (!proc) return
  log(`Killing external player, pid ${proc.pid}`)
  proc.kill('SIGKILL') // kill -9
  proc = null
}

function spawnExternal (playerPath, args) {
  log('Running external media player:', `${playerPath} ${args.join(' ')}`)

  if (process.platform === 'darwin' && path.extname(playerPath) === '.app') {
    // Mac: Use executable in packaged .app bundle
    playerPath += `/Contents/MacOS/${path.basename(playerPath, '.app')}`
  }

  var playerPathStr = playerPath.trim().split(/\s+/);

  if (playerPath.length > 1) {
    playerPath = playerPathStr.shift();
    args = [...playerPathStr, ...args];
  }

  proc = cp.spawn(playerPath, args, { stdio: 'ignore' })

  // If it works, close the modal after a second
  const closeModalTimeout = setTimeout(() =>
    windows.main.dispatch('exitModal'), 1000)

  proc.on('close', code => {
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

  proc.on('error', err => {
    log('External player error', err)
  })
}
