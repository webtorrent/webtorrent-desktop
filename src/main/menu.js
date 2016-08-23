module.exports = {
  init,
  setPlayerOpen,
  setWindowFocus,
  setAllowNav,
  onToggleAlwaysOnTop,
  onToggleFullScreen
}

var electron = require('electron')

var app = electron.app

var config = require('../config')
var dialog = require('./dialog')
var shell = require('./shell')
var windows = require('./windows')

var menu

function init () {
  menu = electron.Menu.buildFromTemplate(getMenuTemplate())
  electron.Menu.setApplicationMenu(menu)
}

function setPlayerOpen (flag) {
  getMenuItem('Play/Pause').enabled = flag
  getMenuItem('Increase Volume').enabled = flag
  getMenuItem('Decrease Volume').enabled = flag
  getMenuItem('Step Forward').enabled = flag
  getMenuItem('Step Backward').enabled = flag
  getMenuItem('Increase Speed').enabled = flag
  getMenuItem('Decrease Speed').enabled = flag
  getMenuItem('Add Subtitles File...').enabled = flag
}

function setWindowFocus (flag) {
  getMenuItem('Full Screen').enabled = flag
  getMenuItem('Float on Top').enabled = flag
}

// Disallow opening more screens on top of the current one.
function setAllowNav (flag) {
  getMenuItem('Preferences').enabled = flag
  getMenuItem(
    process.platform === 'darwin'
      ? 'Create New Torrent...'
      : 'Create New Torrent from Folder...'
  ).enabled = flag
  var item = getMenuItem('Create New Torrent from File...')
  if (item) item.enabled = flag
}

function onToggleAlwaysOnTop (flag) {
  getMenuItem('Float on Top').checked = flag
}

function onToggleFullScreen (flag) {
  getMenuItem('Full Screen').checked = flag
}

function getMenuItem (label) {
  for (var i = 0; i < menu.items.length; i++) {
    var menuItem = menu.items[i].submenu.items.find(function (item) {
      return item.label === label
    })
    if (menuItem) return menuItem
  }
}

function getMenuTemplate () {
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
          role: 'close'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          role: 'undo'
        },
        {
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          label: 'Paste Torrent Address',
          role: 'paste'
        },
        {
          role: 'delete'
        },
        {
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
          click: () => windows.main.toggleFullScreen()
        },
        {
          label: 'Float on Top',
          type: 'checkbox',
          click: () => windows.main.toggleAlwaysOnTop()
        },
        {
          type: 'separator'
        },
        {
          label: 'Go Back',
          accelerator: 'Esc',
          click: () => windows.main.dispatch('escapeBack')
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
              click: () => windows.main.toggleDevTools()
            },
            {
              label: 'Show WebTorrent Process',
              accelerator: process.platform === 'darwin'
                ? 'Alt+Command+P'
                : 'Ctrl+Shift+P',
              click: () => windows.webtorrent.toggleDevTools()
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
          click: () => windows.main.dispatch('playPause'),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Increase Volume',
          accelerator: 'CmdOrCtrl+Up',
          click: () => windows.main.dispatch('changeVolume', 0.1),
          enabled: false
        },
        {
          label: 'Decrease Volume',
          accelerator: 'CmdOrCtrl+Down',
          click: () => windows.main.dispatch('changeVolume', -0.1),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Step Forward',
          accelerator: process.platform === 'darwin'
            ? 'CmdOrCtrl+Alt+Right'
            : 'Alt+Right',
          click: () => windows.main.dispatch('skip', 10),
          enabled: false
        },
        {
          label: 'Step Backward',
          accelerator: process.platform === 'darwin'
            ? 'CmdOrCtrl+Alt+Left'
            : 'Alt+Left',
          click: () => windows.main.dispatch('skip', -10),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Increase Speed',
          accelerator: 'CmdOrCtrl+=',
          click: () => windows.main.dispatch('changePlaybackRate', 1),
          enabled: false
        },
        {
          label: 'Decrease Speed',
          accelerator: 'CmdOrCtrl+-',
          click: () => windows.main.dispatch('changePlaybackRate', -1),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Add Subtitles File...',
          click: () => windows.main.dispatch('openSubtitles'),
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
          click: () => shell.openExternal(config.HOME_PAGE_URL)
        },
        {
          label: 'Contribute on GitHub',
          click: () => shell.openExternal(config.GITHUB_URL)
        },
        {
          type: 'separator'
        },
        {
          label: 'Report an Issue...',
          click: () => shell.openExternal(config.GITHUB_URL_ISSUES)
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    // Add WebTorrent app menu (Mac)
    template.unshift({
      label: config.APP_NAME,
      submenu: [
        {
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => windows.main.dispatch('preferences')
        },
        {
          type: 'separator'
        },
        {
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          role: 'hide'
        },
        {
          role: 'hideothers'
        },
        {
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          role: 'quit'
        }
      ]
    })

    // Add Window menu (Mac)
    template.splice(5, 0, {
      role: 'window',
      submenu: [
        {
          role: 'minimize'
        },
        {
          type: 'separator'
        },
        {
          role: 'front'
        }
      ]
    })
  }

  // On Windows and Linux, open dialogs do not support selecting both files and
  // folders and files, so add an extra menu item so there is one for each type.
  if (process.platform === 'linux' || process.platform === 'win32') {
    // File menu (Windows, Linux)
    template[0].submenu.unshift({
      label: 'Create New Torrent from File...',
      click: () => dialog.openSeedFile()
    })

    // Edit menu (Windows, Linux)
    template[1].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Preferences',
        accelerator: 'CmdOrCtrl+,',
        click: () => windows.main.dispatch('preferences')
      })

    // Help menu (Windows, Linux)
    template[4].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'About ' + config.APP_NAME,
        click: () => windows.about.init()
      }
    )
  }
  // Add "File > Quit" menu item so Linux distros where the system tray icon is
  // missing will have a way to quit the app.
  if (process.platform === 'linux') {
    // File menu (Linux)
    template[0].submenu.push({
      label: 'Quit',
      click: () => app.quit()
    })
  }

  return template
}
