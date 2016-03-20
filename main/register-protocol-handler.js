var config = require('../config')

module.exports = function () {
  if (process.platform === 'win32') {
    registerProtocolHandler('magnet', 'BitTorrent Magnet URL', config.APP_FILE_ICON + '.ico', process.execPath)
    registerFileHandler('.torrent', 'io.webtorrent.torrent', 'BitTorrent Document', config.APP_FILE_ICON + '.ico', process.execPath)
  }
}

/**
 * To add a protocol handler on Windows, the following keys must be added to the Windows
 * registry:
 *
 * HKEY_CLASSES_ROOT
 *    $PROTOCOL
 *       (Default) = "URL:$NAME"
 *       URL Protocol = ""
 *       shell
 *          open
 *             command
 *                (Default) = "$COMMAND" "%1"
 *
 * Source: https://msdn.microsoft.com/en-us/library/aa767914.aspx
 *
 * However, the "HKEY_CLASSES_ROOT" key can only be written by the Administrator user.
 * So, we instead write to "HKEY_CURRENT_USER\Software\Classes", which is inherited by
 * "HKEY_CLASSES_ROOT" anyway, and can be written by unprivileged users.
 */

function registerProtocolHandler (protocol, name, icon, command) {
  var Registry = require('winreg')

  var protocolKey = new Registry({
    hive: Registry.HKCU, // HKEY_CURRENT_USER
    key: '\\Software\\Classes\\' + protocol
  })
  protocolKey.set('', Registry.REG_SZ, 'URL:' + name, callback)
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
    if (err) console.error(err.message || err)
  }
}

function registerFileHandler (ext, id, name, icon, command) {
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
    if (err) console.error(err.message || err)
  }
}
