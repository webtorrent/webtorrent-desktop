module.exports = {
  init,
  onPlayerClose,
  onPlayerOpen,
  onToggleFullScreen,
  onWindowHide,
  onWindowShow
}

var electron = require('electron')

var app = electron.app

var config = require('../config')
var dialog = require('./dialog')
var log = require('./log')
var windows = require('./windows')

var appMenu

function init () {
  appMenu = electron.Menu.buildFromTemplate(getAppMenuTemplate())
  electron.Menu.setApplicationMenu(appMenu)

  if (app.dock) {
    var dockMenu = electron.Menu.buildFromTemplate(getDockMenuTemplate())
    app.dock.setMenu(dockMenu)
  }
}

// Sets whether the window should always show on top of other windows
function toggleFloatOnTop (flag) {
  if (!windows.main.win) return
  log('toggleFloatOnTop %s', flag)
  flag = flag != null ? flag : !windows.main.isAlwaysOnTop()
  windows.main.setAlwaysOnTop(flag)
  getMenuItem('Float on Top').checked = flag
}

function toggleDevTools () {
  if (!windows.main.win) return
  log('toggleDevTools')
  windows.main.toggleDevTools()
}

function showWebTorrentWindow () {
  log('showWebTorrentWindow')
  windows.webtorrent.show()
  windows.webtorrent.win.webContents.openDevTools({ detach: true })
}

function playPause () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'playPause')
}

function increaseVolume () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'changeVolume', 0.1)
}

function decreaseVolume () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'changeVolume', -0.1)
}

function openSubtitles () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'openSubtitles')
}

function skipForward () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'skip', 1)
}

function skipBack () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'skip', -1)
}

function increasePlaybackRate () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'changePlaybackRate', 1)
}

function decreasePlaybackRate () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'changePlaybackRate', -1)
}

// Open the preferences window
function showPreferences () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'preferences')
}

function escapeBack () {
  if (!windows.main.win) return
  windows.main.send('dispatch', 'escapeBack')
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
  log('onPlayerOpen')
  getMenuItem('Play/Pause').enabled = true
  getMenuItem('Increase Volume').enabled = true
  getMenuItem('Decrease Volume').enabled = true
  getMenuItem('Add Subtitles File...').enabled = true
  getMenuItem('Step Forward').enabled = true
  getMenuItem('Step Backward').enabled = true
  getMenuItem('Increase Speed').enabled = true
  getMenuItem('Decrease Speed').enabled = true
}

function onPlayerClose () {
  log('onPlayerClose')
  getMenuItem('Play/Pause').enabled = false
  getMenuItem('Increase Volume').enabled = false
  getMenuItem('Decrease Volume').enabled = false
  getMenuItem('Add Subtitles File...').enabled = false
  getMenuItem('Step Forward').enabled = false
  getMenuItem('Step Backward').enabled = false
  getMenuItem('Increase Speed').enabled = false
  getMenuItem('Decrease Speed').enabled = false
}

function onToggleFullScreen (isFullScreen) {
  if (isFullScreen == null) {
    isFullScreen = windows.main.win.isFullScreen()
  }
  windows.main.win.setMenuBarVisibility(!isFullScreen)
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
          click: () => dialog.openSeedDirectory()
        },
        {
          label: 'Open Torrent File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => dialog.openTorrentFile()
        },
        {
          label: 'Open Torrent Address...',
          accelerator: 'CmdOrCtrl+U',
          click: () => dialog.openTorrentAddress()
        },
        {
          type: 'separator'
        },
        {
          label: process.platform === 'win32'
            ? 'Close'
            : 'Close Window',
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
        },
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => showPreferences()
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
          click: () => windows.toggleFullScreen()
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
          label: 'Go Back',
          accelerator: 'Esc',
          click: escapeBack
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
          label: 'Play/Pause',
          accelerator: 'Space',
          click: playPause,
          enabled: false
        },
        {
          type: 'separator'
        },
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
        },
        {
          type: 'separator'
        },
        {
          label: 'Step Forward',
          accelerator: 'CmdOrCtrl+Alt+Right',
          click: skipForward,
          enabled: false
        },
        {
          label: 'Step Backward',
          accelerator: 'CmdOrCtrl+Alt+Left',
          click: skipBack,
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Increase Speed',
          accelerator: 'CmdOrCtrl+=',
          click: increasePlaybackRate,
          enabled: false
        },
        {
          label: 'Decrease Speed',
          accelerator: 'CmdOrCtrl+-',
          click: decreasePlaybackRate,
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Add Subtitles File...',
          click: openSubtitles,
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
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => showPreferences()
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
  if (process.platform === 'linux' || process.platform === 'win32') {
    // File menu (Windows, Linux)
    template[0].submenu.unshift({
      label: 'Create New Torrent from File...',
      click: () => dialog.openSeedFile()
    })

    // Help menu (Windows, Linux)
    template[4].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'About ' + config.APP_NAME,
        click: () => windows.about.create()
      }
    )
  }
  // Add "File > Quit" menu item so Linux distros where the system tray icon is missing
  // will have a way to quit the app.
  if (process.platform === 'linux') {
    // File menu (Linux)
    template[0].submenu.push({
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
      click: () => dialog.openSeedDirectory()
    },
    {
      label: 'Open Torrent File...',
      accelerator: 'CmdOrCtrl+O',
      click: () => dialog.openTorrentFile()
    },
    {
      label: 'Open Torrent Address...',
      accelerator: 'CmdOrCtrl+U',
      click: () => dialog.openTorrentAddress()
    }
  ]
}
