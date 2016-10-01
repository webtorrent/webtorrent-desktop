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
    icon: getIconPath(), // Window icon (Windows, Linux)
    minWidth: config.WINDOW_MIN_WIDTH,
    minHeight: config.WINDOW_MIN_HEIGHT,
    title: config.APP_WINDOW_TITLE,
    titleBarStyle: 'hidden-inset', // Hide title bar (Mac)
    useContentSize: true, // Specify web page size without OS chrome
    show: false,
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y
  })

  win.once('ready-to-show', function () {
    if (!options.hidden) win.show()
  })

  win.loadURL(config.WINDOW_MAIN)

  if (win.setSheetOffset) win.setSheetOffset(config.UI_HEADER_HEIGHT)

  win.webContents.on('dom-ready', function () {
    menu.onToggleFullScreen(main.win.isFullScreen())
  })

  win.on('blur', onWindowBlur)
  win.on('focus', onWindowFocus)

  win.on('hide', onWindowBlur)
  win.on('show', onWindowFocus)

  win.on('enter-full-screen', function () {
    menu.onToggleFullScreen(true)
    send('fullscreenChanged', true)
    win.setMenuBarVisibility(false)
  })

  win.on('leave-full-screen', function () {
    menu.onToggleFullScreen(false)
    send('fullscreenChanged', false)
    win.setMenuBarVisibility(true)
  })

  win.on('move', function (e) {
    send('windowBoundsChanged', e.sender.getBounds())
  })

  win.on('resize', function (e) {
    send('windowBoundsChanged', e.sender.getBounds())
  })

  win.on('close', function (e) {
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
  main.win.send('dispatch', 'backToList')
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
function setBounds (bounds, maximize) {
  // Do nothing in fullscreen
  if (!main.win || main.win.isFullScreen()) {
    log('setBounds: not setting bounds because we\'re in full screen')
    return
  }

  // Maximize or minimize, if the second argument is present
  let willBeMaximized
  if (maximize === true) {
    if (!main.win.isMaximized()) {
      log('setBounds: maximizing')
      main.win.maximize()
    }
    willBeMaximized = true
  } else if (maximize === false) {
    if (main.win.isMaximized()) {
      log('setBounds: unmaximizing')
      main.win.unmaximize()
    }
    willBeMaximized = false
  } else {
    willBeMaximized = main.win.isMaximized()
  }

  // Assuming we're not maximized or maximizing, set the window size
  if (!willBeMaximized) {
    log('setBounds: setting bounds to ' + JSON.stringify(bounds))
    if (bounds.x === null && bounds.y === null) {
      // X and Y not specified? By default, center on current screen
      const scr = electron.screen.getDisplayMatching(main.win.getBounds())
      bounds.x = Math.round(scr.bounds.x + scr.bounds.width / 2 - bounds.width / 2)
      bounds.y = Math.round(scr.bounds.y + scr.bounds.height / 2 - bounds.height / 2)
      log('setBounds: centered to ' + JSON.stringify(bounds))
    }
    // Resize the window's content area (so window border doesn't need to be taken
    // into account)
    if (bounds.contentBounds) {
      main.win.setContentBounds(bounds, true)
    } else {
      main.win.setBounds(bounds, true)
    }
  } else {
    log('setBounds: not setting bounds because of window maximization')
  }
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
    main.win.webContents.openDevTools({ detach: true })
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
