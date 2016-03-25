module.exports = {
  handleEvent
}

var cp = require('child_process')
var electron = require('electron')
var path = require('path')

var app = electron.app

var config = require('../config')
var handlers = require('./handlers')

function handleEvent (cmd) {
  if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
    // App was installed/updated. (Called on new version of app.)

    // Install protocol/file handlers, desktop/start menu shortcuts.
    handlers.init()
    createShortcuts()

    // Ensure user sees install splash screen so they realize that Setup.exe actually
    // installed an application and isn't the application itself.
    if (cmd === '--squirrel-install') {
      setTimeout(function () {
        app.quit()
      }, 5000)
    } else {
      app.quit()
    }
    return true
  }

  if (cmd === '--squirrel-uninstall') {
    // App was just uninstalled. Undo anything we did in the --squirrel-install and
    // --squirrel-updated handlers

    // TODO: implement this
    app.quit()
    return true
  }

  if (cmd === '--squirrel-obsolete') {
    // App will be updated. (Called on outgoing version of app.)
    app.quit()
    return true
  }

  if (cmd === '--squirrel-firstrun') {
    // This is called on the app's first run. Do not quit, allow startup to continue.
    return false
  }

  return false
}

function createShortcuts () {
  var updateExe = path.join(process.execPath, '..', 'Update.exe')
  var args = [
    '--createShortcut="' + config.APP_NAME + '.exe"',
    '--shortcut-locations="Desktop,StartMenu,Startup"',
    '--process-start-args="--autostart"'
  ]
  cp.execSync(updateExe + args.join(' '))
}
