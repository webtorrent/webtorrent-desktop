module.exports = {
  install,
  uninstall
}

var path = require('path')

var config = require('../config')

function install () {
  if (process.platform === 'darwin') {
    installDarwin()
  }
  if (process.platform === 'win32') {
    installWin32()
  }
  if (process.platform === 'linux') {
    installLinux()
  }
}

function uninstall () {
  if (process.platform === 'darwin') {
    uninstallDarwin()
  }
  if (process.platform === 'win32') {
    uninstallWin32()
  }
  if (process.platform === 'linux') {
    uninstallLinux()
  }
}

function installDarwin () {
  var electron = require('electron')
  var app = electron.app

  // On OS X, only protocols that are listed in Info.plist can be set as the default
  // handler at runtime.
  app.setAsDefaultProtocolClient('magnet')

  // File handlers are registered in the Info.plist.
}

function uninstallDarwin () {}

var EXEC_COMMAND = [ process.execPath ]

if (!config.IS_PRODUCTION) {
  EXEC_COMMAND.push(config.ROOT_PATH)
}
console.log(EXEC_COMMAND.join(' '))

function installWin32 () {
  var Registry = require('winreg')

  var log = require('./log')

  var iconPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'WebTorrentFile.ico')

  registerProtocolHandlerWin32('magnet', 'URL:BitTorrent Magnet URL', iconPath, EXEC_COMMAND)
  registerFileHandlerWin32('.torrent', 'io.webtorrent.torrent', 'BitTorrent Document', iconPath, EXEC_COMMAND)

  /**
   * To add a protocol handler, the following keys must be added to the Windows registry:
   *
   * HKEY_CLASSES_ROOT
   *   $PROTOCOL
   *     (Default) = "$NAME"
   *     URL Protocol = ""
   *     DefaultIcon
   *       (Default) = "$ICON"
   *     shell
   *       open
   *         command
   *           (Default) = "$COMMAND" "%1"
   *
   * Source: https://msdn.microsoft.com/en-us/library/aa767914.aspx
   *
   * However, the "HKEY_CLASSES_ROOT" key can only be written by the Administrator user.
   * So, we instead write to "HKEY_CURRENT_USER\Software\Classes", which is inherited by
   * "HKEY_CLASSES_ROOT" anyway, and can be written by unprivileged users.
   */

  function registerProtocolHandlerWin32 (protocol, name, icon, command) {
    var protocolKey = new Registry({
      hive: Registry.HKCU, // HKEY_CURRENT_USER
      key: '\\Software\\Classes\\' + protocol
    })

    setProtocol()

    function setProtocol (err) {
      if (err) log.error(err.message)
      protocolKey.set('', Registry.REG_SZ, name, setURLProtocol)
    }

    function setURLProtocol (err) {
      if (err) log.error(err.message)
      protocolKey.set('URL Protocol', Registry.REG_SZ, '', setIcon)
    }

    function setIcon (err) {
      if (err) log.error(err.message)

      var iconKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\' + protocol + '\\DefaultIcon'
      })
      iconKey.set('', Registry.REG_SZ, icon, setCommand)
    }

    function setCommand (err) {
      if (err) log.error(err.message)

      var commandKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\' + protocol + '\\shell\\open\\command'
      })
      commandKey.set('', Registry.REG_SZ, `${commandToArgs(command)} "%1"`, done)
    }

    function done (err) {
      if (err) log.error(err.message)
    }
  }

  /**
   * To add a file handler, the following keys must be added to the Windows registry:
   *
   * HKEY_CLASSES_ROOT
   *   $EXTENSION
   *     (Default) = "$EXTENSION_ID"
   *   $EXTENSION_ID
   *     (Default) = "$NAME"
   *     DefaultIcon
   *       (Default) = "$ICON"
   *     shell
   *       open
   *         command
   *           (Default) = "$COMMAND" "%1"
   */
  function registerFileHandlerWin32 (ext, id, name, icon, command) {
    setExt()

    function setExt () {
      var extKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: '\\Software\\Classes\\' + ext
      })
      extKey.set('', Registry.REG_SZ, id, setId)
    }

    function setId (err) {
      if (err) log.error(err.message)

      var idKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\' + id
      })
      idKey.set('', Registry.REG_SZ, name, setIcon)
    }

    function setIcon (err) {
      if (err) log.error(err.message)

      var iconKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\' + id + '\\DefaultIcon'
      })
      iconKey.set('', Registry.REG_SZ, icon, setCommand)
    }

    function setCommand (err) {
      if (err) log.error(err.message)

      var commandKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\' + id + '\\shell\\open\\command'
      })
      commandKey.set('', Registry.REG_SZ, `${commandToArgs(command)} "%1"`, done)
    }

    function done (err) {
      if (err) log.error(err.message)
    }
  }
}

function uninstallWin32 () {
  var Registry = require('winreg')

  unregisterProtocolHandlerWin32('magnet', EXEC_COMMAND)
  unregisterFileHandlerWin32('.torrent', 'io.webtorrent.torrent', EXEC_COMMAND)

  function unregisterProtocolHandlerWin32 (protocol, command) {
    getCommand()

    function getCommand () {
      var commandKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: '\\Software\\Classes\\' + protocol + '\\shell\\open\\command'
      })
      commandKey.get('', function (err, item) {
        if (!err && item.value.indexOf(commandToArgs(command)) >= 0) {
          destroyProtocol()
        }
      })
    }

    function destroyProtocol () {
      var protocolKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\' + protocol
      })
      protocolKey.destroy(function () {})
    }
  }

  function unregisterFileHandlerWin32 (ext, id, command) {
    eraseId()

    function eraseId () {
      var idKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: '\\Software\\Classes\\' + id
      })
      idKey.destroy(getExt)
    }

    function getExt () {
      var extKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\' + ext
      })
      extKey.get('', function (err, item) {
        if (!err && item.value === id) {
          destroyExt()
        }
      })
    }

    function destroyExt () {
      var extKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: '\\Software\\Classes\\' + ext
      })
      extKey.destroy(function () {})
    }
  }
}

function commandToArgs (command) {
  return command.map((arg) => `"${arg}"`).join(' ')
}

function installLinux () {
  var fs = require('fs-extra')
  var os = require('os')
  var path = require('path')

  var config = require('../config')
  var log = require('./log')

  installDesktopFile()
  installIconFile()

  function installDesktopFile () {
    var templatePath = path.join(config.STATIC_PATH, 'linux', 'webtorrent-desktop.desktop')
    fs.readFile(templatePath, 'utf8', writeDesktopFile)
  }

  function writeDesktopFile (err, desktopFile) {
    if (err) return log.error(err.message)

    var appPath = config.IS_PRODUCTION
      ? path.dirname(process.execPath)
      : config.ROOT_PATH

    desktopFile = desktopFile.replace(/\$APP_NAME/g, config.APP_NAME)
    desktopFile = desktopFile.replace(/\$APP_PATH/g, appPath)
    desktopFile = desktopFile.replace(/\$EXEC_PATH/g, EXEC_COMMAND.join(' '))
    desktopFile = desktopFile.replace(/\$TRY_EXEC_PATH/g, process.execPath)

    var desktopFilePath = path.join(
      os.homedir(),
      '.local',
      'share',
      'applications',
      'webtorrent-desktop.desktop'
    )
    fs.mkdirp(path.dirname(desktopFilePath))
    fs.writeFile(desktopFilePath, desktopFile, function (err) {
      if (err) return log.error(err.message)
    })
  }

  function installIconFile () {
    var iconStaticPath = path.join(config.STATIC_PATH, 'WebTorrent.png')
    fs.readFile(iconStaticPath, writeIconFile)
  }

  function writeIconFile (err, iconFile) {
    if (err) return log.error(err.message)

    var iconFilePath = path.join(
      os.homedir(),
      '.local',
      'share',
      'icons',
      'webtorrent-desktop.png'
    )
    fs.mkdirp(path.dirname(iconFilePath))
    fs.writeFile(iconFilePath, iconFile, function (err) {
      if (err) return log.error(err.message)
    })
  }
}

function uninstallLinux () {
  var os = require('os')
  var path = require('path')
  var fs = require('fs-extra')

  var desktopFilePath = path.join(
    os.homedir(),
    '.local',
    'share',
    'applications',
    'webtorrent-desktop.desktop'
  )
  fs.removeSync(desktopFilePath)

  var iconFilePath = path.join(
    os.homedir(),
    '.local',
    'share',
    'icons',
    'webtorrent-desktop.png'
  )
  fs.removeSync(iconFilePath)
}
