import config from '../config.js'
import path from 'path'

export function install () {
  switch (process.platform) {
    case 'darwin': installDarwin()
      break
    case 'win32': installWin32()
      break
  }
}

export function uninstall () {
  switch (process.platform) {
    case 'darwin': uninstallDarwin()
      break
    case 'win32': uninstallWin32()
      break
  }
}

async function installDarwin () {
  const { app } = await import('electron')
  // On Mac, only protocols that are listed in `Info.plist` can be set as the
  // default handler at runtime.
  app.setAsDefaultProtocolClient('magnet')
  app.setAsDefaultProtocolClient('stream-magnet')

  // File handlers are defined in `Info.plist`.
}

function uninstallDarwin () {}

const EXEC_COMMAND = [process.execPath, '--']

if (!config.IS_PRODUCTION) {
  EXEC_COMMAND.push(config.ROOT_PATH)
}

async function installWin32 () {
  const Registry = await import('wingreg')
  const log = await import('./log')

  const iconPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'static', 'WebTorrentFile.ico')
  registerProtocolHandlerWin32('magnet', 'URL:BitTorrent Magnet URL', iconPath, EXEC_COMMAND)
  registerProtocolHandlerWin32('stream-magnet', 'URL:BitTorrent Stream-Magnet URL', iconPath, EXEC_COMMAND)
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

async function uninstallWin32 () {
  const Registry = await import('winreg')
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
