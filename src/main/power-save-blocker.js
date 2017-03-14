module.exports = {
  enable,
  disable
}

const electron = require('electron')
const log = require('./log')

let blockId = 0

/**
 * Block the system from entering low-power (sleep) mode or turning off the
 * display.
 */
function enable () {
  if (electron.powerSaveBlocker.isStarted(blockId)) {
    // If a power saver block already exists, do nothing.
    return
  }
  blockId = electron.powerSaveBlocker.start('prevent-display-sleep')
  log(`powerSaveBlocker.enable: ${blockId}`)
}

/**
 * Stop blocking the system from entering low-power mode.
 */
function disable () {
  if (!electron.powerSaveBlocker.isStarted(blockId)) {
    // If a power saver block does not exist, do nothing.
    return
  }
  electron.powerSaveBlocker.stop(blockId)
  log(`powerSaveBlocker.disable: ${blockId}`)
}
