module.exports = {
  init,
  setPlayerOpen,
  setWindowFocus,
  setAllowNav,
  onToggleAlwaysOnTop,
  onToggleFullScreen
}

var electron = require('electron')
var IntlMessageFormat = require('intl-messageformat')

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
  getMenuItem('menu-play-pause').enabled = flag
  getMenuItem('menu-volume-up').enabled = flag
  getMenuItem('menu-volume-down').enabled = flag
  getMenuItem('menu-step-forward').enabled = flag
  getMenuItem('menu-step-backward').enabled = flag
  getMenuItem('menu-speed-up').enabled = flag
  getMenuItem('menu-speed-down').enabled = flag
  getMenuItem('menu-subtitles-add').enabled = flag
}

function setWindowFocus (flag) {
  getMenuItem('menu-full-screen').enabled = flag
  getMenuItem('menu-float-top').enabled = flag
}

// Disallow opening more screens on top of the current one.
function setAllowNav (flag) {
  getMenuItem('menu-preferences').enabled = flag
  getMenuItem('menu-create-torrent').enabled = flag
  if (process.platform !== 'darwin') {
    getMenuItem('menu-create-torrent-file').enabled = flag
  }
}

function onToggleAlwaysOnTop (flag) {
  getMenuItem('menu-float-top').checked = flag
}

function onToggleFullScreen (flag) {
  getMenuItem('menu-full-screen').checked = flag
}

function getMenuItem (id) {
  for (var i = 0; i < menu.items.length; i++) {
    var menuItem = menu.items[i].submenu.items.find(function (item) {
      return item.id === id
    })
    if (menuItem) return menuItem
  }
}

function getMenuTemplate () {
  // Defer i18n loading to access electron locale
  var i18n = require('../i18n')
  var template = [
    {
      id: 'menu-file',
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-file'] || 'File', i18n.LANGUAGE).format(),
      submenu: [
        {
          id: 'menu-create-torrent',
          label: process.platform === 'darwin'
            ? new IntlMessageFormat(
              i18n.LOCALE_MESSAGES['create-torrent'] || 'Create New Torrent...', i18n.LANGUAGE).format()
            : new IntlMessageFormat(
              i18n.LOCALE_MESSAGES['menu-create-torrent-folder'] || 'Create New Torrent from Folder...', i18n.LANGUAGE).format(),
          accelerator: 'CmdOrCtrl+N',
          click: () => dialog.openSeedDirectory()
        },
        {
          id: 'menu-open-torrent-file',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-open-torrent-file'] || 'Open Torrent File...', i18n.LANGUAGE).format(),
          accelerator: 'CmdOrCtrl+O',
          click: () => dialog.openTorrentFile()
        },
        {
          id: 'menu-open-torrent-address',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-open-torrent-address'] || 'Open Torrent Address...', i18n.LANGUAGE).format(),
          accelerator: 'CmdOrCtrl+U',
          click: () => dialog.openTorrentAddress()
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-close',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-close'] || 'Close', i18n.LANGUAGE).format(),
          role: 'close'
        }
      ]
    },
    {
      id: 'menu-edit',
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-edit'] || 'Edit', i18n.LANGUAGE).format(),
      submenu: [
        {
          id: 'menu-undo',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-undo'] || 'Undo', i18n.LANGUAGE).format(),
          role: 'undo'
        },
        {
          id: 'menu-redo',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-redo'] || 'Redo', i18n.LANGUAGE).format(),
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-cut',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-cut'] || 'Cut', i18n.LANGUAGE).format(),
          role: 'cut'
        },
        {
          id: 'menu-copy',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-copy'] || 'Copy', i18n.LANGUAGE).format(),
          role: 'copy'
        },
        {
          id: 'menu-paste',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-paste'] || 'Paste Torrent Address', i18n.LANGUAGE).format(),
          role: 'paste'
        },
        {
          id: 'menu-delete',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-delete'] || 'Delete', i18n.LANGUAGE).format(),
          role: 'delete'
        },
        {
          id: 'menu-select-all',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-select-all'] || 'Select All', i18n.LANGUAGE).format(),
          role: 'selectall'
        }
      ]
    },
    {
      id: 'menu-view',
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-view'] || 'View', i18n.LANGUAGE).format(),
      submenu: [
        {
          id: 'menu-full-screen',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-full-screen'] || 'Full Screen', i18n.LANGUAGE).format(),
          type: 'checkbox',
          accelerator: process.platform === 'darwin'
            ? 'Ctrl+Command+F'
            : 'F11',
          click: () => windows.main.toggleFullScreen()
        },
        {
          id: 'menu-float-top',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-float-top'] || 'Float on Top', i18n.LANGUAGE).format(),
          type: 'checkbox',
          click: () => windows.main.toggleAlwaysOnTop()
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-back',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-back'] || 'Go Back', i18n.LANGUAGE).format(),
          accelerator: 'Esc',
          click: () => windows.main.dispatch('escapeBack')
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-developer',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-developer'] || 'Developer', i18n.LANGUAGE).format(),
          submenu: [
            {
              id: 'menu-developer-tools',
              label: new IntlMessageFormat(
                i18n.LOCALE_MESSAGES['menu-developer-tools'] || 'Developer Tools', i18n.LANGUAGE).format(),
              accelerator: process.platform === 'darwin'
                ? 'Alt+Command+I'
                : 'Ctrl+Shift+I',
              click: () => windows.main.toggleDevTools()
            },
            {
              id: 'menu-process-show',
              label: new IntlMessageFormat(
                i18n.LOCALE_MESSAGES['menu-process-show'] || 'Show WebTorrent Process', i18n.LANGUAGE).format(),
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
      id: 'menu-playback',
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['playback'] || 'Playback', i18n.LANGUAGE).format(),
      submenu: [
        {
          id: 'menu-play-pause',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-play-pause'] || 'Play/Pause', i18n.LANGUAGE).format(),
          accelerator: 'Space',
          click: () => windows.main.dispatch('playPause'),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-volume-up',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-volume-up'] || 'Increase Volume', i18n.LANGUAGE).format(),
          accelerator: 'CmdOrCtrl+Up',
          click: () => windows.main.dispatch('changeVolume', 0.1),
          enabled: false
        },
        {
          id: 'menu-volume-down',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-volume-down'] || 'Decrease Volume', i18n.LANGUAGE).format(),
          accelerator: 'CmdOrCtrl+Down',
          click: () => windows.main.dispatch('changeVolume', -0.1),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-step-forward',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-step-forward'] || 'Step Forward', i18n.LANGUAGE).format(),
          accelerator: process.platform === 'darwin'
            ? 'CmdOrCtrl+Alt+Right'
            : 'Alt+Right',
          click: () => windows.main.dispatch('skip', 10),
          enabled: false
        },
        {
          id: 'menu-step-backward',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-step-backward'] || 'Step Backward', i18n.LANGUAGE).format(),
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
          id: 'menu-speed-up',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-speed-up'] || 'Increase Speed', i18n.LANGUAGE).format(),
          accelerator: 'CmdOrCtrl+=',
          click: () => windows.main.dispatch('changePlaybackRate', 1),
          enabled: false
        },
        {
          id: 'menu-speed-down',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-speed-down'] || 'Decrease Speed', i18n.LANGUAGE).format(),
          accelerator: 'CmdOrCtrl+-',
          click: () => windows.main.dispatch('changePlaybackRate', -1),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-subtitles-add',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-subtitles-add'] || 'Add Subtitles File...', i18n.LANGUAGE).format(),
          click: () => windows.main.dispatch('openSubtitles'),
          enabled: false
        }
      ]
    },
    {
      id: 'menu-help',
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-help'] || 'Help', i18n.LANGUAGE).format(),
      role: 'help',
      submenu: [
        {
          id: 'menu-learn-more',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-learn-more'] || 'Learn more about {appName}', i18n.LANGUAGE).format({
              appName: config.APP_NAME
            }),
          click: () => shell.openExternal(config.HOME_PAGE_URL)
        },
        {
          id: 'menu-contribute',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-contribute'] || 'Contribute on GitHub', i18n.LANGUAGE).format(),
          click: () => shell.openExternal(config.GITHUB_URL)
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-report-issue',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-report-issue'] || 'Report an issue', i18n.LANGUAGE).format(),
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
          id: 'menu-about',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['about'] || 'About {appName}', i18n.LANGUAGE).format({
              appName: config.APP_NAME
            }),
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-preferences',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['preferences'] || 'Preferences', i18n.LANGUAGE).format(),
          accelerator: 'Cmd+,',
          click: () => windows.main.dispatch('preferences')
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-services',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-services'] || 'Services', i18n.LANGUAGE).format(),
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-hide',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-hide'] || 'Hide', i18n.LANGUAGE).format(),
          role: 'hide'
        },
        {
          id: 'menu-hideothers',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-hideothers'] || 'Hide Others', i18n.LANGUAGE).format(),
          role: 'hideothers'
        },
        {
          id: 'menu-unhide',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-unhide'] || 'Unhide', i18n.LANGUAGE).format(),
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-quit',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-quit'] || 'Quit', i18n.LANGUAGE).format(),
          role: 'quit'
        }
      ]
    })

    // Add Window menu (Mac)
    template.splice(5, 0, {
      role: 'window',
      submenu: [
        {
          id: 'menu-minimize',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-minimize'] || 'Minimize', i18n.LANGUAGE).format(),
          role: 'minimize'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-front',
          label: new IntlMessageFormat(
            i18n.LOCALE_MESSAGES['menu-font'] || 'Bring to Front', i18n.LANGUAGE).format(),
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
      id: 'menu-create-torrent-file',
      label: new IntlMessageFormat(
          i18n.LOCALE_MESSAGES['menu-create-torrent-file'] || 'Create New Torrent from File...', i18n.LANGUAGE).format(),
      click: () => dialog.openSeedFile()
    })

    // Edit menu (Windows, Linux)
    template[1].submenu.push(
      {
        type: 'separator'
      },
      {
        id: 'menu-preferences',
        label: new IntlMessageFormat(
          i18n.LOCALE_MESSAGES['preferences'] || 'Preferences', i18n.LANGUAGE).format(),
        accelerator: 'CmdOrCtrl+,',
        click: () => windows.main.dispatch('preferences')
      })

    // Help menu (Windows, Linux)
    template[4].submenu.push(
      {
        type: 'separator'
      },
      {
        id: 'menu-about',
        label: new IntlMessageFormat(
          i18n.LOCALE_MESSAGES['about'] || 'About {appName}', i18n.LANGUAGE).format({
            appName: config.APP_NAME
          }),
        click: () => windows.about.init()
      }
    )
  }
  // Add "File > Quit" menu item so Linux distros where the system tray icon is
  // missing will have a way to quit the app.
  if (process.platform === 'linux') {
    // File menu (Linux)
    template[0].submenu.push({
      id: 'menu-quit',
      label: new IntlMessageFormat(
        i18n.LOCALE_MESSAGES['menu-quit'] || 'Quit', i18n.LANGUAGE).format(),
      click: () => app.quit()
    })
  }

  return template
}
