module.exports = {
  start,
  stop
}

var electron = require('electron')
var log = require('./log')

var powerSaveBlockerId = 0

function start () {
  // Stop the previous power saver block, if one exists.
  stop()

  powerSaveBlockerId = electron.powerSaveBlocker.start('prevent-display-sleep')
  log('powerSaveBlocker.start %d', powerSaveBlockerId)
}

function stop () {
  if (!electron.powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    return
  }
  electron.powerSaveBlocker.stop(powerSaveBlockerId)
  log('powerSaveBlocker.stop %d', powerSaveBlockerId)
}
