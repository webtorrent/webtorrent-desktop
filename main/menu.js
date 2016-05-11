module.exports = {
  init,
  onPlayerClose,
  onPlayerOpen,
  onToggleFullScreen,
  onWindowHide,
  onWindowShow,
  showOpenSeedFiles,
  showOpenTorrentAddress,
  showOpenTorrentFile,
  toggleFullScreen
}

var electron = require('electron')

var app = electron.app

var config = require('../config')
var log = require('./log')
var windows = require('./windows')

var appMenu, dockMenu

function init () {
  appMenu = electron.Menu.buildFromTemplate(getAppMenuTemplate())
  electron.Menu.setApplicationMenu(appMenu)

  dockMenu = electron.Menu.buildFromTemplate(getDockMenuTemplate())
  if (app.dock) app.dock.setMenu(dockMenu)
}

function toggleFullScreen (flag) {
  log('toggleFullScreen %s', flag)
  if (windows.main && windows.main.isVisible()) {
    flag = flag != null ? flag : !windows.main.isFullScreen()
    windows.main.setFullScreen(flag)
  }
}

// Sets whether the window should always show on top of other windows
function toggleFloatOnTop (flag) {
  log('toggleFloatOnTop %s', flag)
  if (windows.main) {
    flag = flag != null ? flag : !windows.main.isAlwaysOnTop()
    windows.main.setAlwaysOnTop(flag)
    getMenuItem('Float on Top').checked = flag
  }
}

function increaseVolume () {
  if (windows.main) {
    windows.main.send('dispatch', 'changeVolume', 0.1)
  }
}

function decreaseVolume () {
  if (windows.main) {
    windows.main.send('dispatch', 'changeVolume', -0.1)
  }
}

function toggleDevTools () {
  log('toggleDevTools')
  if (windows.main) {
    windows.main.toggleDevTools()
  }
}

function showWebTorrentWindow () {
  windows.webtorrent.show()
  windows.webtorrent.webContents.openDevTools({ detach: true })
}

function onWindowShow () {
  log('onWindowShow')
  getMenuItem('Full Screen').enabled = true
  getMenuItem('Float on Top').enabled = true
}

function onWindowHide () {
  log('onWindowHide')
  getMenuItem('Full Screen').enabled = false
  getMenuItem('Float on Top').enabled = false
}

function onPlayerOpen () {
  getMenuItem('Increase Volume').enabled = true
  getMenuItem('Decrease Volume').enabled = true
}

function onPlayerClose () {
  getMenuItem('Increase Volume').enabled = false
  getMenuItem('Decrease Volume').enabled = false
}

function onToggleFullScreen (isFullScreen) {
  isFullScreen = isFullScreen != null ? isFullScreen : windows.main.isFullScreen()
  windows.main.setMenuBarVisibility(!isFullScreen)
  getMenuItem('Full Screen').checked = isFullScreen
  windows.main.send('fullscreenChanged', isFullScreen)
}

function getMenuItem (label) {
  for (var i = 0; i < appMenu.items.length; i++) {
    var menuItem = appMenu.items[i].submenu.items.find(function (item) {
      return item.label === label
    })
    if (menuItem) return menuItem
  }
}

// Prompts the user for a file, then creates a torrent. Only allows a single file
// selection.
function showOpenSeedFile () {
  electron.dialog.showOpenDialog({
    title: 'Select a file for the torrent file.',
    properties: [ 'openFile' ]
  }, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    var selectedPath = selectedPaths[0]
    windows.main.send('dispatch', 'showCreateTorrent', selectedPath)
  })
}

// Prompts the user for a file or directory, then creates a torrent. Only allows a single
// selection. To create a multi-file torrent, the user must select a directory.
function showOpenSeedFiles () {
  electron.dialog.showOpenDialog({
    title: 'Select a file or folder for the torrent file.',
    properties: [ 'openFile', 'openDirectory' ]
  }, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    var selectedPath = selectedPaths[0]
    windows.main.send('dispatch', 'showCreateTorrent', selectedPath)
  })
}

// Prompts the user to choose a torrent file, then adds it to the app
function showOpenTorrentFile () {
  electron.dialog.showOpenDialog(windows.main, {
    title: 'Select a .torrent file to open.',
    filters: [{ name: 'Torrent Files', extensions: ['torrent'] }],
    properties: [ 'openFile', 'multiSelections' ]
  }, function (selectedPaths) {
    if (!Array.isArray(selectedPaths)) return
    selectedPaths.forEach(function (selectedPath) {
      windows.main.send('dispatch', 'addTorrent', selectedPath)
    })
  })
}

// Prompts the user for the URL of a torrent file, then downloads and adds it
function showOpenTorrentAddress () {
  windows.main.send('showOpenTorrentAddress')
}

function getAppMenuTemplate () {
  var template = [
    {
      label: 'File',
      submenu: [
        {
          label: process.platform === 'darwin'
            ? 'Create New Torrent...'
            : 'Create New Torrent from Folder...',
          accelerator: 'CmdOrCtrl+N',
          click: showOpenSeedFiles
        },
        {
          label: 'Open Torrent File...',
          accelerator: 'CmdOrCtrl+O',
          click: showOpenTorrentFile
        },
        {
          label: 'Open Torrent Address...',
          accelerator: 'CmdOrCtrl+U',
          click: showOpenTorrentAddress
        },
        {
          type: 'separator'
        },
        {
          label: process.platform === 'windows' ? 'Close' : 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste Torrent Address',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Full Screen',
          type: 'checkbox',
          accelerator: process.platform === 'darwin'
            ? 'Ctrl+Command+F'
            : 'F11',
          click: () => toggleFullScreen()
        },
        {
          label: 'Float on Top',
          type: 'checkbox',
          click: () => toggleFloatOnTop()
        },
        {
          type: 'separator'
        },
        {
          label: 'Developer',
          submenu: [
            {
              label: 'Developer Tools',
              accelerator: process.platform === 'darwin'
                ? 'Alt+Command+I'
                : 'Ctrl+Shift+I',
              click: toggleDevTools
            },
            {
              label: 'Show WebTorrent Process',
              accelerator: process.platform === 'darwin'
                ? 'Alt+Command+P'
                : 'Ctrl+Shift+P',
              click: showWebTorrentWindow
            }
          ]
        }
      ]
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Increase Volume',
          accelerator: 'CmdOrCtrl+Up',
          click: increaseVolume,
          enabled: false
        },
        {
          label: 'Decrease Volume',
          accelerator: 'CmdOrCtrl+Down',
          click: decreaseVolume,
          enabled: false
        }
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn more about ' + config.APP_NAME,
          click: () => electron.shell.openExternal(config.HOME_PAGE_URL)
        },
        {
          label: 'Contribute on GitHub',
          click: () => electron.shell.openExternal(config.GITHUB_URL)
        },
        {
          type: 'separator'
        },
        {
          label: 'Report an Issue...',
          click: () => electron.shell.openExternal(config.GITHUB_URL_ISSUES)
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    // Add WebTorrent app menu (OS X)
    template.unshift({
      label: config.APP_NAME,
      submenu: [
        {
          label: 'About ' + config.APP_NAME,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + config.APP_NAME,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => app.quit()
        }
      ]
    })

    // Add Window menu (OS X)
    template.splice(5, 0, {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          role: 'front'
        }
      ]
    })
  }

  // In Linux and Windows it is not possible to open both folders and files
  if (process.platform === 'linux' || process.platform === 'windows') {
    // File menu (Windows, Linux)
    template[0].unshift({
      label: 'Create New Torrent from File...',
      click: showOpenSeedFile
    })

    // Help menu (Windows, Linux)
    template[4].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'About ' + config.APP_NAME,
        click: windows.createAboutWindow
      }
    )
  }
  // Add "File > Quit" menu item for Linux distros where the system tray is broken
  if (process.platform === 'linux') {
    // File menu (Linux)
    template[0].push({
      label: 'Quit',
      click: () => app.quit()
    })
  }

  return template
}

function getDockMenuTemplate () {
  return [
    {
      label: 'Create New Torrent...',
      accelerator: 'CmdOrCtrl+N',
      click: showOpenSeedFiles
    },
    {
      label: 'Open Torrent File...',
      accelerator: 'CmdOrCtrl+O',
      click: showOpenTorrentFile
    },
    {
      label: 'Open Torrent Address...',
      accelerator: 'CmdOrCtrl+U',
      click: showOpenTorrentAddress
    }
  ]
}
