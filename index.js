var electron = require('electron')
var path = require('path')

var app = electron.app

// report crashes
// require('crash-reporter').start({
//   productName: 'WebTorrent',
//   companyName: 'WebTorrent',
//   submitURL: 'https://webtorrent.io/crash-report',
//   autoSubmit: true
// })

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')()

// prevent window being garbage collected
var mainWindow

app.on('ready', function () {
  mainWindow = createMainWindow()
})

app.on('activate', function () {
  if (!mainWindow) mainWindow = createMainWindow()
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

function createMainWindow () {
  const win = new electron.BrowserWindow({
    width: 600,
    height: 400,
    titleBarStyle: 'hidden'
  })
  win.loadURL('file://' + path.join(__dirname, 'index.html'))
  win.once('closed', function () {
    mainWindow = null
  })
  return win
}
