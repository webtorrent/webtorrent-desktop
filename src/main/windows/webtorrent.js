const webtorrent = module.exports = {
  init,
  send,
  show,
  toggleDevTools,
  win: null
}

const electron = require('electron')

const config = require('../../config')

function init () {
  const win = webtorrent.win = new electron.BrowserWindow({
    backgroundColor: '#1E1E1E',
    center: true,
    fullscreen: false,
    fullscreenable: false,
    height: 150,
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    title: 'webtorrent-hidden-window',
    useContentSize: true,
    webPreferences: {
      nodeIntegration: true,
      enableBlinkFeatures: 'AudioVideoTracks'
    },
    width: 150
  })

  win.loadURL(config.WINDOW_WEBTORRENT)

  // Prevent killing the WebTorrent process
  win.on('close', function (e) {
    if (electron.app.isQuitting) {
      return
    }
    e.preventDefault()
    win.hide()
  })
}

function show () {
  if (!webtorrent.win) return
  webtorrent.win.show()
}

function send (...args) {
  if (!webtorrent.win) return
  webtorrent.win.send(...args)
}

function toggleDevTools () {
  if (!webtorrent.win) return
  if (webtorrent.win.webContents.isDevToolsOpened()) {
    webtorrent.win.webContents.closeDevTools()
    webtorrent.win.hide()
  } else {
    webtorrent.win.webContents.openDevTools({ mode: 'detach' })
  }
}
