const about = module.exports = {
  init,
  win: null
}

const config = require('../../config')
const electron = require('electron')

function init () {
  if (about.win) {
    return about.win.show()
  }

  const win = about.win = new electron.BrowserWindow({
    backgroundColor: '#ECECEC',
    center: true,
    fullscreen: false,
    height: 220,
    icon: getIconPath(),
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    title: 'About ' + config.APP_WINDOW_TITLE,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true,
      enableBlinkFeatures: 'AudioVideoTracks'
    },
    width: 300
  })

  win.loadURL(config.WINDOW_ABOUT)

  // No menu on the About window
  win.setMenu(null)

  win.once('ready-to-show', function () {
    win.show()
  })

  win.once('closed', function () {
    about.win = null
  })
}

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}
