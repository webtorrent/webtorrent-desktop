module.exports = {
  init
}

var path = require('path')

var log = require('./log')

function init () {
  if (process.platform === 'darwin') {
    initDarwin()
  }
  if (process.platform === 'win32') {
    initWin32()
  }
  if (process.platform === 'linux') {
    initLinux()
  }
}

function initDarwin () {
  var electron = require('electron')
  var app = electron.app

  // On OS X, only protocols that are listed in Info.plist can be set as the default
  // handler at runtime.
  app.setAsDefaultProtocolClient('magnet')

  // File handlers are registered in the Info.plist.
}

function initWin32 () {
  var Registry = require('winreg')

  var iconPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'WebTorrentFile.ico')

  registerProtocolHandlerWin32('magnet', 'URL:BitTorrent Magnet URL', iconPath, process.execPath)
  registerFileHandlerWin32('.torrent', 'io.webtorrent.torrent', 'BitTorrent Document', iconPath, process.execPath)

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
    setProtocol()

    var protocolKey = new Registry({
      hive: Registry.HKCU, // HKEY_CURRENT_USER
      key: '\\Software\\Classes\\' + protocol
    })

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
      commandKey.set('', Registry.REG_SZ, '"' + command + '" "%1"', done)
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
      commandKey.set('', Registry.REG_SZ, '"' + command + '" "%1"', done)
    }

    function done (err) {
      if (err) log.error(err.message)
    }
  }
}

function initLinux () {
  var config = require('../config')
  var fs = require('fs')
  var mkdirp = require('mkdirp')
  var os = require('os')
  var path = require('path')

  installDesktopFile()
  installIconFile()

  function installDesktopFile () {
    var templatePath = path.join(config.STATIC_PATH, 'linux', 'webtorrent-desktop.desktop')
    fs.readFile(templatePath, 'utf8', writeDesktopFile)
  }

  function writeDesktopFile (err, desktopFile) {
    if (err) return log.error(err.message)

    var appPath = config.IS_PRODUCTION ? path.dirname(process.execPath) : config.ROOT_PATH
    var execPath = process.execPath + (config.IS_PRODUCTION ? '' : ' \.')
    var tryExecPath = process.execPath

    desktopFile = desktopFile.replace(/\$APP_NAME/g, config.APP_NAME)
    desktopFile = desktopFile.replace(/\$APP_PATH/g, appPath)
    desktopFile = desktopFile.replace(/\$EXEC_PATH/g, execPath)
    desktopFile = desktopFile.replace(/\$TRY_EXEC_PATH/g, tryExecPath)

    var desktopFilePath = path.join(
      os.homedir(),
      '.local',
      'share',
      'applications',
      'webtorrent-desktop.desktop'
    )
    mkdirp(path.dirname(desktopFilePath))
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
    mkdirp(path.dirname(iconFilePath))
    fs.writeFile(iconFilePath, iconFile, function (err) {
      if (err) return log.error(err.message)
    })
  }
}
