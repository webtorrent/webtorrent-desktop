module.exports = {
  handleArgv
}

var electron = require('electron')

var app = electron.app

var handlers = require('./handlers')

function handleArgv (cmd) {
  if (cmd === '--squirrel-install') {
    // App was just installed.
    handlers.init()

    // TODO:
    // - Install desktop and start menu shortcuts
    // - Add explorer context menus

    // Ensure user sees install splash screen so they realize that Setup.exe actually
    // installed an application and isn't the application itself.
    setTimeout(function () {
      app.quit()
    }, 5000)
    return true
  }

  if (cmd === '--squirrel-updated') {
    // App was just updated. (Called on new version of app.)
    handlers.init()
    app.quit()
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
