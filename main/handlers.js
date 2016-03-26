module.exports = {
  init
}

var log = require('./log')

function init () {
  if (process.platform === 'win32') {
    var path = require('path')
    var iconPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'WebTorrentFile.ico')
    registerProtocolHandlerWin32('magnet', 'URL:BitTorrent Magnet URL', iconPath, process.execPath)
    registerFileHandlerWin32('.torrent', 'io.webtorrent.torrent', 'BitTorrent Document', iconPath, process.execPath)
  }
  if (process.platform === 'linux') {
    installDesktopFile()
    installDesktopIcon()
  }
}

function installDesktopFile () {
  var config = require('../config')
  var fs = require('fs')
  var path = require('path')
  var os = require('os')

  var templatePath = path.join(config.STATIC_PATH, 'webtorrent.desktop')
  var desktopFile = fs.readFileSync(templatePath, 'utf8')

  desktopFile = desktopFile.replace(/\$APP_NAME/g, config.APP_NAME)

  var appPath = config.IS_PRODUCTION ? path.dirname(process.execPath) : config.ROOT_PATH
  desktopFile = desktopFile.replace(/\$APP_PATH/g, appPath)

  var execPath = process.execPath + (config.IS_PRODUCTION ? '' : ' \.')
  desktopFile = desktopFile.replace(/\$EXEC_PATH/g, execPath)

  desktopFile = desktopFile.replace(/\$TRY_EXEC_PATH/g, process.execPath)

  var desktopFilePath = path.join(os.homedir(), '.local', 'share', 'applications', 'webtorrent.desktop')
  fs.writeFileSync(desktopFilePath, desktopFile)
}

function installDesktopIcon () {
  var config = require('../config')
  var fs = require('fs')
  var path = require('path')
  var os = require('os')

  var iconStaticPath = path.join(config.STATIC_PATH, 'WebTorrent.png')
  var iconFile = fs.readFileSync(iconStaticPath)

  var iconFilePath = path.join(os.homedir(), '.local', 'share', 'icons', 'webtorrent.png')
  ensureDirectory(iconFilePath)
  fs.writeFileSync(iconFilePath, iconFile)
}

function ensureDirectory (filePath) {
  var fs = require('fs')
  var path = require('path')

  var dirname = path.dirname(filePath)
  try {
    if (fs.statSync(dirname).isDirectory()) return
  } catch (err) {}
  ensureDirectory(dirname)
  fs.mkdirSync(dirname)
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
