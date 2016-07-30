module.exports = {
  handleEvent
}

var cp = require('child_process')
var electron = require('electron')
var fs = require('fs')
var os = require('os')
var path = require('path')

var app = electron.app

var handlers = require('./handlers')

var EXE_NAME = path.basename(process.execPath)
var UPDATE_EXE = path.join(process.execPath, '..', '..', 'Update.exe')

function handleEvent (cmd) {
  if (cmd === '--squirrel-install') {
    // App was installed. Install desktop/start menu shortcuts.
    createShortcuts(function () {
      // Ensure user sees install splash screen so they realize that Setup.exe actually
      // installed an application and isn't the application itself.
      setTimeout(function () {
        app.quit()
      }, 3000)
    })
    return true
  }

  if (cmd === '--squirrel-updated') {
    // App was updated. (Called on new version of app)
    updateShortcuts(function () {
      app.quit()
    })
    return true
  }

  if (cmd === '--squirrel-uninstall') {
    // App was just uninstalled. Undo anything we did in the --squirrel-install and
    // --squirrel-updated handlers

    // Uninstall .torrent file and magnet link handlers
    handlers.uninstall()

    // Remove desktop/start menu shortcuts.
    // HACK: add a callback to handlers.uninstall() so we can remove this setTimeout
    setTimeout(function () {
      removeShortcuts(function () {
        app.quit()
      })
    }, 1000)

    return true
  }

  if (cmd === '--squirrel-obsolete') {
    // App will be updated. (Called on outgoing version of app)
    app.quit()
    return true
  }

  if (cmd === '--squirrel-firstrun') {
    // App is running for the first time. Do not quit, allow startup to continue.
    return false
  }

  return false
}

/**
 * Spawn a command and invoke the callback when it completes with an error and
 * the output from standard out.
 */
function spawn (command, args, cb) {
  var stdout = ''

  var child
  try {
    child = cp.spawn(command, args)
  } catch (err) {
    // Spawn can throw an error
    process.nextTick(function () {
      cb(error, stdout)
    })
    return
  }

  child.stdout.on('data', function (data) {
    stdout += data
  })

  var error = null
  child.on('error', function (processError) {
    error = processError
  })
  child.on('close', function (code, signal) {
    if (code !== 0 && !error) error = new Error('Command failed: #{signal || code}')
    if (error) error.stdout = stdout
    cb(error, stdout)
  })
}

/**
 * Spawn the Squirrel `Update.exe` command with the given arguments and invoke
 * the callback when the command completes.
 */
function spawnUpdate (args, cb) {
  spawn(UPDATE_EXE, args, cb)
}

/**
 * Create desktop and start menu shortcuts using the Squirrel `Update.exe`
 * command.
 */
function createShortcuts (cb) {
  spawnUpdate(['--createShortcut', EXE_NAME], cb)
}

/**
 * Update desktop and start menu shortcuts using the Squirrel `Update.exe`
 * command.
 */
function updateShortcuts (cb) {
  var homeDir = os.homedir()
  if (homeDir) {
    var desktopShortcutPath = path.join(homeDir, 'Desktop', 'WebTorrent.lnk')
    // If the desktop shortcut was deleted by the user, then keep it deleted.
    fs.access(desktopShortcutPath, function (err) {
      var desktopShortcutExists = !err
      createShortcuts(function () {
        if (desktopShortcutExists) {
          cb()
        } else {
          // Remove the unwanted desktop shortcut that was recreated
          fs.unlink(desktopShortcutPath, cb)
        }
      })
    })
  } else {
    createShortcuts(cb)
  }
}

/**
 * Remove desktop and start menu shortcuts using the Squirrel `Update.exe`
 * command.
 */
function removeShortcuts (cb) {
  spawnUpdate(['--removeShortcut', EXE_NAME], cb)
}
