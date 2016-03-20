module.exports = function () {
  if (process.platform === 'win32') {
    registerProtocolHandler('magnet', 'URL:BitTorrent Magnet URL', 'WebTorrent.exe')
  }
}

function registerProtocolHandler (protocol, name, command) {
  var Registry = require('winreg')

  var protocolKey = new Registry({
    hive: Registry.HKCU, // HKEY_CURRENT_USER
    key: '\\Software\\Classes\\' + protocol
  })
  protocolKey.set('', Registry.REG_SZ, name, callback)
  protocolKey.set('URL Protocol', Registry.REG_SZ, '', callback)

  var commandKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Classes\\' + protocol + '\\shell\\open\\command'
  })
  commandKey.set('', Registry.REG_SZ, '"' + command + '" "%1"', callback)

  function callback (err) {
    if (err) console.error(err.message || err)
  }
}
