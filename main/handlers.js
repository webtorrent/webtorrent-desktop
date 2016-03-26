module.exports = {
  init
}

var path = require('path')

var log = require('./log')

function init () {
  if (process.platform === 'win32') {
    initWindows()
  }
  if (process.platform === 'linux') {
    initLinux()
  }
}

function initWindows () {
  var iconPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'WebTorrentFile.ico')
  registerProtocolHandlerWin32('magnet', 'URL:BitTorrent Magnet URL', iconPath, process.execPath)
  registerFileHandlerWin32('.torrent', 'io.webtorrent.torrent', 'BitTorrent Document', iconPath, process.execPath)
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
    var templatePath = path.join(config.STATIC_PATH, 'webtorrent.desktop')
    fs.readFile(templatePath, 'utf8', writeDesktopFile)
  }

  function writeDesktopFile (err, desktopFile) {
    if (err) return console.error(err.message)

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
      'webtorrent.desktop'
    )
    mkdirp(path.dirname(desktopFilePath))
    fs.writeFile(desktopFilePath, desktopFile, function (err) {
      if (err) return console.error(err.message)
    })
  }

  function installIconFile () {
    var iconStaticPath = path.join(config.STATIC_PATH, 'WebTorrent.png')
    fs.readFile(iconStaticPath, writeIconFile)
  }

  function writeIconFile (err, iconFile) {
    if (err) return console.error(err.message)

    var iconFilePath = path.join(
      os.homedir(),
      '.local',
      'share',
      'icons',
      'webtorrent.png'
    )
    mkdirp(path.dirname(iconFilePath))
    fs.writeFile(iconFilePath, iconFile, function (err) {
      if (err) return console.error(err.message)
    })
  }
}

/**
 * To add a protocol handler on Windows, the following keys must be added to the Windows
 * registry:
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
  var Registry = require('winreg')

  var protocolKey = new Registry({
    hive: Registry.HKCU, // HKEY_CURRENT_USER
    key: '\\Software\\Classes\\' + protocol
  })
  protocolKey.set('', Registry.REG_SZ, name, callback)
  protocolKey.set('URL Protocol', Registry.REG_SZ, '', callback)

  var iconKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Classes\\' + protocol + '\\DefaultIcon'
  })
  iconKey.set('', Registry.REG_SZ, icon, callback)

  var commandKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Classes\\' + protocol + '\\shell\\open\\command'
  })
  commandKey.set('', Registry.REG_SZ, '"' + command + '" "%1"', callback)

  function callback (err) {
    if (err) log.error(err.message || err)
  }
}

function registerFileHandlerWin32 (ext, id, name, icon, command) {
  var Registry = require('winreg')

  var extKey = new Registry({
    hive: Registry.HKCU, // HKEY_CURRENT_USER
    key: '\\Software\\Classes\\' + ext
  })
  extKey.set('', Registry.REG_SZ, id, callback)

  var idKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Classes\\' + id
  })
  idKey.set('', Registry.REG_SZ, name, callback)

  var iconKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Classes\\' + id + '\\DefaultIcon'
  })
  iconKey.set('', Registry.REG_SZ, icon, callback)

  var commandKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Classes\\' + id + '\\shell\\open\\command'
  })
  commandKey.set('', Registry.REG_SZ, '"' + command + '" "%1"', callback)

  function callback (err) {
    if (err) log.error(err.message || err)
  }
}
