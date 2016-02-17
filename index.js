var electron = require('electron')
var path = require('path')

var app = electron.app

// report crashes to the Electron project
require('crash-reporter').start({
  // TODO: collect crash reports
  // productName: 'WebTorrent',
  // companyName: 'WebTorrent',
  // submitURL: 'https://webtorrent.io/crash-report',
  // autoSubmit: true
})

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')()

// prevent window being garbage collected
var mainWindow

function onClosed () {
  // dereference the window
  // for multiple windows store them in an array
  mainWindow = null
}

function createMainWindow () {
  const win = new electron.BrowserWindow({
    width: 600,
    height: 400
  })

  win.loadURL('file://' + path.join(__dirname, 'index.html'))
  win.on('closed', onClosed)

  return win
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  }
})

app.on('ready', () => {
  mainWindow = createMainWindow()
})
