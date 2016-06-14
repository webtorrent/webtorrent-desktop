module.exports = {
  init,
  onPlayerClose,
  onPlayerOpen,
  onToggleAlwaysOnTop,
  onToggleFullScreen,
  onWindowBlur,
  onWindowFocus
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

function onPlayerClose () {
  getMenuItem('Play/Pause').enabled = false
  getMenuItem('Next Track').enabled = false
  getMenuItem('Previous Track').enabled = false
  getMenuItem('Increase Volume').enabled = false
  getMenuItem('Decrease Volume').enabled = false
  getMenuItem('Step Forward').enabled = false
  getMenuItem('Step Backward').enabled = false
  getMenuItem('Increase Speed').enabled = false
  getMenuItem('Decrease Speed').enabled = false
  getMenuItem('Add Subtitles File...').enabled = false
}

function onPlayerOpen () {
  getMenuItem('Play/Pause').enabled = true
  getMenuItem('Next Track').enabled = true
  getMenuItem('Previous Track').enabled = true
  getMenuItem('Increase Volume').enabled = true
  getMenuItem('Decrease Volume').enabled = true
  getMenuItem('Step Forward').enabled = true
  getMenuItem('Step Backward').enabled = true
  getMenuItem('Increase Speed').enabled = true
  getMenuItem('Decrease Speed').enabled = true
  getMenuItem('Add Subtitles File...').enabled = true
}

function onToggleAlwaysOnTop (flag) {
  getMenuItem('Float on Top').checked = flag
}

function onToggleFullScreen (flag) {
  getMenuItem('Full Screen').checked = flag
}

function onWindowBlur () {
  getMenuItem('Full Screen').enabled = false
  getMenuItem('Float on Top').enabled = false
}

function onWindowFocus () {
  getMenuItem('Full Screen').enabled = true
  getMenuItem('Float on Top').enabled = true
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
          click: () => windows.main.dispatch('preferences')
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
          label: 'Next Track',
          accelerator: 'N',
          click: () => windows.main.dispatch('next'),
          enabled: false
        },
        {
          label: 'Previous Track',
          accelerator: 'P',
          click: () => windows.main.dispatch('prev'),
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
          click: () => windows.main.dispatch('skip', 1),
          enabled: false
        },
        {
          label: 'Step Backward',
          accelerator: process.platform === 'darwin'
            ? 'CmdOrCtrl+Alt+Left'
            : 'Alt+Left',
          click: () => windows.main.dispatch('skip', -1),
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
          click: () => windows.main.dispatch('preferences')
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

  // On Windows and Linux, open dialogs do not support selecting both files and
  // folders and files, so add an extra menu item so there is one for each type.
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
