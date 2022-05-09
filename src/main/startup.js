import { APP_NAME } from '../config.js'
import AutoLaunch from 'auto-launch'

const appLauncher = new AutoLaunch({
  name: APP_NAME,
  isHidden: true
})

export function install () {
  return appLauncher
    .isEnabled()
    .then(enabled => {
      if (!enabled) return appLauncher.enable()
    })
}

export function uninstall () {
  return appLauncher
    .isEnabled()
    .then(enabled => {
      if (enabled) return appLauncher.disable()
    })
}
