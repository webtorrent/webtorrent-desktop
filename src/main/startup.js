module.exports = {
  install,
  uninstall
}

const { APP_NAME } = require('../config')
const AutoLaunch = require('auto-launch')

const appLauncher = new AutoLaunch({
  name: APP_NAME,
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
