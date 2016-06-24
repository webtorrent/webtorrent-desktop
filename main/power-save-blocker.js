module.exports = {
  enable,
  disable
}

var electron = require('electron')
var log = require('./log')

var blockId = 0

/**
 * Block the system from entering low-power (sleep) mode or turning off the
 * display.
 */
function enable () {
  disable() // Stop the previous power saver block, if one exists.
  blockId = electron.powerSaveBlocker.start('prevent-display-sleep')
  log(`powerSaveBlocker.enable: ${blockId}`)
}

/**
 * Stop blocking the system from entering low-power mode.
 */
function disable () {
  if (!electron.powerSaveBlocker.isStarted(blockId)) {
    return
  }
  electron.powerSaveBlocker.stop(blockId)
  log(`powerSaveBlocker.disable: ${blockId}`)
}
