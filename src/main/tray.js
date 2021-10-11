import { app, Tray, Menu } from 'electron'
import config from '../config.js'
import * as windows from './windows'

let tray

export function init () {
  if (process.platform === 'linux') {
    initLinux()
  }
  if (process.platform === 'win32') {
    initWin32()
  }
  // Mac apps generally do not have menu bar icons
}

/**
 * Returns true if there a tray icon is active.
 */
export function hasTray () {
  return !!tray
}

export function setWindowFocus (flag) {
  if (!tray) return
  updateTrayMenu()
}

function initLinux () {
  checkLinuxTraySupport(err => {
    if (!err) createTray()
  })
}

function initWin32 () {
  createTray()
}

/**
 * Check for libappindicator support before creating tray icon.
 */
async function checkLinuxTraySupport (cb) {
  const cp = await import('child_process')

  // Check that libappindicator libraries are installed in system.
  cp.exec('ldconfig -p | grep libappindicator', (err, stdout) => {
    if (err) return cb(err)
    cb(null)
  })
}

function createTray () {
  tray = new Tray(getIconPath())

  // On Windows, left click opens the app, right click opens the context menu.
  // On Linux, any click (left or right) opens the context menu.
  tray.on('click', () => windows.main.show())

  // Show the tray context menu, and keep the available commands up to date
  updateTrayMenu()
}

function updateTrayMenu () {
  const contextMenu = Menu.buildFromTemplate(getMenuTemplate())
  tray.setContextMenu(contextMenu)
}

function getMenuTemplate () {
  return [
    getToggleItem(),
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]

  function getToggleItem () {
    if (windows.main.win.isVisible()) {
      return {
        label: 'Hide to tray',
        click: () => windows.main.hide()
      }
    } else {
      return {
        label: 'Show WebTorrent',
        click: () => windows.main.show()
      }
    }
  }
}

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}
