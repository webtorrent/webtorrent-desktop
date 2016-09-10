module.exports = {
  install,
  uninstall
}

const config = require('../config')
const AutoLaunch = require('auto-launch')
const { app } = require('electron')

// On Mac, work around a bug in auto-launch where it opens a Terminal window
// See https://github.com/Teamwork/node-auto-launch/issues/28#issuecomment-222194437
const appPath = process.platform === 'darwin'
  ? app.getPath('exe').replace(/\.app\/Content.*/, '.app')
  : undefined // Use the default

const appLauncher = new AutoLaunch({
  name: config.APP_NAME,
  path: appPath,
  isHidden: true
})

function install () {
  return appLauncher
    .isEnabled()
    .then(enabled => {
      if (!enabled) return appLauncher.enable()
    })
}

function uninstall () {
  return appLauncher
    .isEnabled()
    .then(enabled => {
      if (enabled) return appLauncher.disable()
    })
}
