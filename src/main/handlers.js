module.exports = {
  install,
  uninstall
}

const config = require('../config')
const path = require('path')

function install () {
  switch (process.platform) {
    case 'darwin': installDarwin()
      break
    case 'win32': installWin32()
      break
    case 'linux': installLinux()
      break
  }
}

function uninstall () {
  switch (process.platform) {
    case 'darwin': uninstallDarwin()
      break
    case 'win32': uninstallWin32()
      break
    case 'linux': uninstallLinux()
      break
  }
}

function installDarwin () {
  const electron = require('electron')
  const app = electron.app

  // On Mac, only protocols that are listed in `Info.plist` can be set as the
  // default handler at runtime.
  app.setAsDefaultProtocolClient('magnet')
  app.setAsDefaultProtocolClient('stream-magnet')

  // File handlers are defined in `Info.plist`.
}

function uninstallDarwin () {}

const EXEC_COMMAND = [ process.execPath, '--' ]

if (!config.IS_PRODUCTION) {
  EXEC_COMMAND.push(config.ROOT_PATH)
}

function installWin32 () {
  const Registry = require('winreg')

  const log = require('./log')

  const iconPath = path.join(
    process.resourcesPath, 'app.asar.unpacked', 'static', 'WebTorrentFile.ico'
  )
  registerProtocolHandlerWin32(
    'magnet',
    'URL:BitTorrent Magnet URL',
    iconPath,
    EXEC_COMMAND
  )
  registerProtocolHandlerWin32(
    'stream-magnet',
    'URL:BitTorrent Stream-Magnet URL',
    iconPath,
    EXEC_COMMAND
  )
  registerFileHandlerWin32(
    '.torrent',
    'io.webtorrent.torrent',
    'BitTorrent Document',
    iconPath,
    EXEC_COMMAND
  )

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
    const protocolKey = new Registry({
      hive: Registry.HKCU, // HKEY_CURRENT_USER
      key: '\\Software\\Classes\\' + protocol
    })

    setProtocol()

    function setProtocol (err) {
      if (err) return log.error(err.message)
      protocolKey.set('', Registry.REG_SZ, name, setURLProtocol)
    }

    function setURLProtocol (err) {
      if (err) return log.error(err.message)
      protocolKey.set('URL Protocol', Registry.REG_SZ, '', setIcon)
    }

    function setIcon (err) {
      if (err) return log.error(err.message)

      const iconKey = new Registry({
        hive: Registry.HKCU,
        key: `\\Software\\Classes\\${protocol}\\DefaultIcon`
      })
      iconKey.set('', Registry.REG_SZ, icon, setCommand)
    }

    function setCommand (err) {
      if (err) return log.error(err.message)

      const commandKey = new Registry({
        hive: Registry.HKCU,
        key: `\\Software\\Classes\\${protocol}\\shell\\open\\command`
      })
      commandKey.set('', Registry.REG_SZ, `${commandToArgs(command)} "%1"`, done)
    }

    function done (err) {
      if (err) return log.error(err.message)
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
      const extKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: `\\Software\\Classes\\${ext}`
      })
      extKey.set('', Registry.REG_SZ, id, setId)
    }

    function setId (err) {
      if (err) return log.error(err.message)

      const idKey = new Registry({
        hive: Registry.HKCU,
        key: `\\Software\\Classes\\${id}`
      })
      idKey.set('', Registry.REG_SZ, name, setIcon)
    }

    function setIcon (err) {
      if (err) return log.error(err.message)

      const iconKey = new Registry({
        hive: Registry.HKCU,
        key: `\\Software\\Classes\\${id}\\DefaultIcon`
      })
      iconKey.set('', Registry.REG_SZ, icon, setCommand)
    }

    function setCommand (err) {
      if (err) return log.error(err.message)

      const commandKey = new Registry({
        hive: Registry.HKCU,
        key: `\\Software\\Classes\\${id}\\shell\\open\\command`
      })
      commandKey.set('', Registry.REG_SZ, `${commandToArgs(command)} "%1"`, done)
    }

    function done (err) {
      if (err) return log.error(err.message)
    }
  }
}

function uninstallWin32 () {
  const Registry = require('winreg')

  unregisterProtocolHandlerWin32('magnet', EXEC_COMMAND)
  unregisterProtocolHandlerWin32('stream-magnet', EXEC_COMMAND)
  unregisterFileHandlerWin32('.torrent', 'io.webtorrent.torrent', EXEC_COMMAND)

  function unregisterProtocolHandlerWin32 (protocol, command) {
    getCommand()

    function getCommand () {
      const commandKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: `\\Software\\Classes\\${protocol}\\shell\\open\\command`
      })
      commandKey.get('', (err, item) => {
        if (!err && item.value.indexOf(commandToArgs(command)) >= 0) {
          destroyProtocol()
        }
      })
    }

    function destroyProtocol () {
      const protocolKey = new Registry({
        hive: Registry.HKCU,
        key: `\\Software\\Classes\\${protocol}`
      })
      protocolKey.destroy(() => {})
    }
  }

  function unregisterFileHandlerWin32 (ext, id, command) {
    eraseId()

    function eraseId () {
      const idKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: `\\Software\\Classes\\${id}`
      })
      idKey.destroy(getExt)
    }

    function getExt () {
      const extKey = new Registry({
        hive: Registry.HKCU,
        key: `\\Software\\Classes\\${ext}`
      })
      extKey.get('', (err, item) => {
        if (!err && item.value === id) {
          destroyExt()
        }
      })
    }

    function destroyExt () {
      const extKey = new Registry({
        hive: Registry.HKCU, // HKEY_CURRENT_USER
        key: `\\Software\\Classes\\${ext}`
      })
      extKey.destroy(() => {})
    }
  }
}

function commandToArgs (command) {
  return command.map((arg) => `"${arg}"`).join(' ')
}

function installLinux () {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')

  const config = require('../config')
  const log = require('./log')

  // Do not install in user dir if running on system
  if (/^\/opt/.test(process.execPath)) return

  installDesktopFile()
  installIconFile()

  function installDesktopFile () {
    const templatePath = path.join(
      config.STATIC_PATH, 'linux', 'webtorrent-desktop.desktop'
    )
    fs.readFile(templatePath, 'utf8', writeDesktopFile)
  }

  function writeDesktopFile (err, desktopFile) {
    if (err) return log.error(err.message)

    const appPath = config.IS_PRODUCTION
      ? path.dirname(process.execPath)
      : config.ROOT_PATH

    desktopFile = desktopFile
      .replace(/\$APP_NAME/g, config.APP_NAME)
      .replace(/\$APP_PATH/g, appPath)
      .replace(/\$EXEC_PATH/g, EXEC_COMMAND.join(' '))
      .replace(/\$TRY_EXEC_PATH/g, process.execPath)

    const desktopFilePath = path.join(
      os.homedir(),
      '.local',
      'share',
      'applications',
      'webtorrent-desktop.desktop'
    )
    fs.mkdirp(path.dirname(desktopFilePath))
    fs.writeFile(desktopFilePath, desktopFile, err => {
      if (err) return log.error(err.message)
    })
  }

  function installIconFile () {
    const iconStaticPath = path.join(config.STATIC_PATH, 'WebTorrent.png')
    fs.readFile(iconStaticPath, writeIconFile)
  }

  function writeIconFile (err, iconFile) {
    if (err) return log.error(err.message)

    const mkdirp = require('mkdirp')

    const iconFilePath = path.join(
      os.homedir(),
      '.local',
      'share',
      'icons',
      'webtorrent-desktop.png'
    )
    mkdirp(path.dirname(iconFilePath), err => {
      if (err) return log.error(err.message)
      fs.writeFile(iconFilePath, iconFile, err => {
        if (err) log.error(err.message)
      })
    })
  }
}

function uninstallLinux () {
  const os = require('os')
  const path = require('path')
  const rimraf = require('rimraf')

  const desktopFilePath = path.join(
    os.homedir(),
    '.local',
    'share',
    'applications',
    'webtorrent-desktop.desktop'
  )
  rimraf(desktopFilePath)

  const iconFilePath = path.join(
    os.homedir(),
    '.local',
    'share',
    'icons',
    'webtorrent-desktop.png'
  )
  rimraf(iconFilePath)
}
