const main = module.exports = {
  dispatch,
  hide,
  init,
  send,
  setAspectRatio,
  setBounds,
  setProgress,
  setTitle,
  show,
  toggleAlwaysOnTop,
  toggleDevTools,
  toggleFullScreen,
  win: null
}

const electron = require('electron')
const debounce = require('debounce')

const app = electron.app

const config = require('../../config')
const log = require('../log')
const menu = require('../menu')

function init (state, options) {
  if (main.win) {
    return main.win.show()
  }

  const initialBounds = Object.assign(config.WINDOW_INITIAL_BOUNDS, state.saved.bounds)

  const win = main.win = new electron.BrowserWindow({
    backgroundColor: '#282828',
    darkTheme: true, // Forces dark theme (GTK+3)
    height: initialBounds.height,
    icon: getIconPath(), // Window icon (Windows, Linux)
    minHeight: config.WINDOW_MIN_HEIGHT,
    minWidth: config.WINDOW_MIN_WIDTH,
    show: false,
    title: config.APP_WINDOW_TITLE,
    titleBarStyle: 'hiddenInset', // Hide title bar (Mac)
    useContentSize: true, // Specify web page size without OS chrome
    width: initialBounds.width,
    webPreferences: {
      nodeIntegration: true,
      enableBlinkFeatures: 'AudioVideoTracks',
      enableRemoteModule: true,
      backgroundThrottling: false
    },
    x: initialBounds.x,
    y: initialBounds.y
  })

  win.loadURL(config.WINDOW_MAIN)

  win.once('ready-to-show', () => {
    if (!options.hidden) win.show()
  })

  if (win.setSheetOffset) {
    win.setSheetOffset(config.UI_HEADER_HEIGHT)
  }

  win.webContents.on('dom-ready', () => {
    menu.onToggleFullScreen(main.win.isFullScreen())
  })

  win.webContents.on('will-navigate', (e, url) => {
    // Prevent drag-and-drop from navigating the Electron window, which can happen
    // before our drag-and-drop handlers have been initialized.
    e.preventDefault()
  })

  win.on('blur', onWindowBlur)
  win.on('focus', onWindowFocus)

  win.on('hide', onWindowBlur)
  win.on('show', onWindowFocus)

  win.on('enter-full-screen', () => {
    menu.onToggleFullScreen(true)
    send('fullscreenChanged', true)
    win.setMenuBarVisibility(false)
  })

  win.on('leave-full-screen', () => {
    menu.onToggleFullScreen(false)
    send('fullscreenChanged', false)
    win.setMenuBarVisibility(true)
  })

  win.on('move', debounce(e => {
    send('windowBoundsChanged', e.sender.getBounds())
  }, 1000))

  win.on('resize', debounce(e => {
    send('windowBoundsChanged', e.sender.getBounds())
  }, 1000))

  win.on('close', e => {
    if (process.platform !== 'darwin') {
      const tray = require('../tray')
      if (!tray.hasTray()) {
        app.quit()
        return
      }
    }
    if (!app.isQuitting) {
      e.preventDefault()
      hide()
    }
  })
}

function dispatch (...args) {
  send('dispatch', ...args)
}

function hide () {
  if (!main.win) return
  dispatch('backToList')
  main.win.hide()
}

function send (...args) {
  if (!main.win) return
  main.win.send(...args)
}

/**
 * Enforce window aspect ratio. Remove with 0. (Mac)
 */
function setAspectRatio (aspectRatio) {
  if (!main.win) return
  main.win.setAspectRatio(aspectRatio)
}

/**
 * Change the size of the window.
 * TODO: Clean this up? Seems overly complicated.
 */
function setBounds (bounds) {
  // X and Y not specified? By default, center on current screen
  if (bounds.x === null && bounds.y === null) {
    const display = electron.screen.getDisplayMatching(main.win.getBounds())

    bounds.x = Math.round(display.bounds.x + (display.bounds.width / 2) - (bounds.width / 2))
    bounds.y = Math.round(display.bounds.y + (display.bounds.height / 2) - (bounds.height / 2))
  }

  log(`setBounds: setting bounds to ${JSON.stringify(bounds)}`)

  main.win.setBounds(bounds, true)
}

/**
 * Set progress bar to [0, 1]. Indeterminate when > 1. Remove with < 0.
 */
function setProgress (progress) {
  if (!main.win) return
  main.win.setProgressBar(progress)
}

function setTitle (title) {
  if (!main.win) return
  main.win.setTitle(title)
}

function show () {
  if (!main.win) return
  main.win.show()
}

// Sets whether the window should always show on top of other windows
function toggleAlwaysOnTop (flag) {
  if (!main.win) return
  if (flag == null) {
    flag = !main.win.isAlwaysOnTop()
  }
  log(`toggleAlwaysOnTop ${flag}`)
  main.win.setAlwaysOnTop(flag)
  menu.onToggleAlwaysOnTop(flag)
}

function toggleDevTools () {
  if (!main.win) return
  log('toggleDevTools')
  if (main.win.webContents.isDevToolsOpened()) {
    main.win.webContents.closeDevTools()
  } else {
    main.win.webContents.openDevTools({ mode: 'detach' })
  }
}

function toggleFullScreen (flag) {
  if (!main.win || !main.win.isVisible()) {
    return
  }

  if (flag == null) flag = !main.win.isFullScreen()

  log(`toggleFullScreen ${flag}`)

  if (flag) {
    // Fullscreen and aspect ratio do not play well together. (Mac)
    main.win.setAspectRatio(0)
  }

  main.win.setFullScreen(flag)
}

function onWindowBlur () {
  menu.setWindowFocus(false)

  if (process.platform !== 'darwin') {
    const tray = require('../tray')
    tray.setWindowFocus(false)
  }
}

function onWindowFocus () {
  menu.setWindowFocus(true)

  if (process.platform !== 'darwin') {
    const tray = require('../tray')
    tray.setWindowFocus(true)
  }
}

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}
