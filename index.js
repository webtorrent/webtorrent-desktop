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
var mainWindow // eslint-disable-line no-unused-vars

app.on('ready', function () {
  mainWindow = createMainWindow()
})

app.on('activate', function () {
  if (mainWindow) {
    mainWindow.show()
  } else {
    mainWindow = createMainWindow()
  }
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

var isQuitting = false
app.on('before-quit', function () {
  isQuitting = true
})

ipc.on('action', function (event, action, ...args) {
  debug('action %s', action)
})

function createMainWindow () {
  var win = new electron.BrowserWindow({
    width: 600,
    height: 400,
    title: 'WebTorrent',
    // titleBarStyle: 'hidden',
    show: false
  })
  win.loadURL('file://' + path.join(__dirname, 'main', 'index.html'))
  win.webContents.on('did-finish-load', function () {
    win.show()
  })
  win.on('close', function (e) {
    if (process.platform === 'darwin' && !isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })
  win.once('closed', function () {
    mainWindow = null
  })
  return win
}

// var progress = 0
// setInterval(function () {
//   progress += 0.1
//   mainWindow.setProgressBar(progress)
// }, 1000)
