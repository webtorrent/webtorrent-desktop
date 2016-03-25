module.exports = {
  handleArgv
}

var electron = require('electron')

var app = electron.app

var handlers = require('./handlers')

function handleArgv (cmd) {
  if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
    handlers.init()

    // TODO:
    // - Install desktop and start menu shortcuts
    // - Add explorer context menus

    // Always quit when done
    app.quit()
    return true
  }

  if (cmd === '--squirrel-uninstall') {
    // Undo anything we did in the --squirrel-install and --squirrel-updated handlers

    // TODO: implement this

    // Always quit when done
    app.quit()
    return true
  }

  if (cmd === '--squirrel-obsolete') {
    // This is called on the outgoing version of your app before we update to the new
    // version - it's the opposite of --squirrel-updated

    // Always quit when done
    app.quit()
    return true
  }

  if (cmd === '--squirrel-firstrun') {
    // This is called on the first run of the app.

    // Do not quit the app
    return false
  }

  return false
}
