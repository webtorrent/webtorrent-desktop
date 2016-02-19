require('debug/browser')

var debug = require('debug')('index')
var electron = require('electron')
var path = require('path')

var app = electron.app
var ipc = electron.ipcMain

// report crashes
// require('crash-reporter').start({
//   productName: 'WebTorrent',
//   companyName: 'WebTorrent',
//   submitURL: 'https://webtorrent.io/crash-report',
//   autoSubmit: true
// })

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')()

// prevent windows from being garbage collected
var mainWindow, backgroundWindow // eslint-disable-line no-unused-vars

app.on('ready', function () {
  mainWindow = createMainWindow()
  backgroundWindow = createBackgroundWindow()
})

app.on('activate', function () {
  if (!mainWindow) mainWindow = createMainWindow()
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipc.on('action', function (event, action, ...args) {
  debug('action %s', action)
  backgroundWindow.webContents.send('action', action, ...args)
})

function createMainWindow () {
  var win = new electron.BrowserWindow({
    width: 600,
    height: 400,
    title: 'WebTorrent',
    // titleBarStyle: 'hidden',
    show: false
  })
  win.loadURL('file://' + path.join(__dirname, 'main.html'))
  win.webContents.on('did-finish-load', function () {
    win.show()
  })
  win.once('closed', function () {
    mainWindow = null
  })
  return win
}

function createBackgroundWindow () {
  var opts = debug.enabled
    ? { width: 600, height: 400, x: 0, y: 0 }
    : { width: 0, height: 0, show: false }
  var win = new electron.BrowserWindow(opts)
  win.loadURL('file://' + path.join(__dirname, 'background.html'))
  win.once('closed', function () {
    backgroundWindow = null
  })
  return win
}

// var progress = 0
// setInterval(function () {
//   progress += 0.1
//   mainWindow.setProgressBar(progress)
// }, 1000)
