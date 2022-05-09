import { powerSaveBlocker } from 'electron'
import log from './log.js'

let blockId = 0

/**
 * Block the system from entering low-power (sleep) mode or turning off the
 * display.
 */
export function enable () {
  if (powerSaveBlocker.isStarted(blockId)) {
    // If a power saver block already exists, do nothing.
    return
  }
  blockId = powerSaveBlocker.start('prevent-display-sleep')
  log(`powerSaveBlocker.enable: ${blockId}`)
}

/**
 * Stop blocking the system from entering low-power mode.
 */
export function disable () {
  if (!powerSaveBlocker.isStarted(blockId)) {
    // If a power saver block does not exist, do nothing.
    return
  }
  powerSaveBlocker.stop(blockId)
  log(`powerSaveBlocker.disable: ${blockId}`)
}
