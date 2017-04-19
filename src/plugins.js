const {exec} = require('child_process')
const {resolve, basename} = require('path')
const {writeFileSync} = require('fs')
const State = require('./renderer/lib/state')
const notifier = require('node-notifier')
const {app} = require('electron')

const {sync: mkdirpSync} = require('mkdirp')
const ms = require('ms')
const shellEnv = require('shell-env')
const crypto = require('crypto')

const config = require('./config')

module.exports = class Plugins {
  constructor () {
    // modules path
    this.path = resolve(config.getConfigPath(), 'plugins')
    log('path: ', this.path)
    this.availableExtensions = new Set([
      'onApp', 'onWindow', 'decorateMenu', 'decorateWindow',
      'decorateConfig', 'initRenderer', 'onCheckForSubtitles'
    ])

    this.forceUpdate = false
    this.updating = false
    this.watchers = []
  }

  init (state) {
    this.state = state

    // initialize state
    this.state.saved = Object.assign(this.state.saved || {})

    // init plugin directories if not present
    mkdirpSync(this.path)

    // caches
    this.plugins = config.getPlugins()
    this.paths = this.getPaths(this.plugins)
    this.id = this.getId(this.plugins)
    this.modules = this.requirePlugins()

    // we listen on configuration updates to trigger
    // plugin installation
    config.subscribe(() => {
      const plugins = config.getPlugins()
      if (plugins !== this.plugins) {
        const id = this.getId(plugins)
        if (this.id !== id) {
          this.alert('Installing plugins...')
          log('UPDATING...')
          this.id = id
          this.plugins = plugins
          this.paths = this.getPaths(this.plugins)
          this.updatePlugins()
        }
      }
    })

    // schedule the initial plugins update
    // a bit after the user launches the app
    // to prevent slowness
    if (this.needsUpdate()) {
      setTimeout(() => {
        this.updatePlugins()
      }, 5000)
      log('installation scheduled')
    }

    // update plugins every 5 hours
    setInterval(() => {
      this.updatePlugins()
    }, ms('5h'))
  }

  initRenderer (params) {
    this.modules.forEach(plugin => {
      if (plugin.initRenderer) {
        plugin.initRenderer(params)
      }
    })
  }

  on (action, params) {
    log(`ON ${action}:`, params)
    this.modules.forEach(plugin => {
      const actionName = this.capitalizeFirstLetter(action)
      const actionHandler = plugin[`on${actionName}`]
      if (actionHandler) actionHandler(params)
    })
  }

  capitalizeFirstLetter (string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  didPluginsChange () {
    return this.state.saved.installedPlugins !== this.id
  }

  hasPlugins () {
    return !this.isEmptyObject(this.plugins)
  }

  isFirstInstall () {
    return (!this.state.saved.installedPlugins && this.hasPlugins())
  }

  needsUpdate () {
    return (this.didPluginsChange() || this.isFirstInstall())
  }

  getId (plugins) {
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(plugins))
    return hash.digest('hex')
  }

  updatePlugins (forceUpdate = false) {
    this.forceUpdate = forceUpdate
    if (this.updating) {
      // TODO
      // return notify('Plugin update in progress')
    }
    this.updating = true
    this.syncPackageJSON()
    this.installPackages((err) => this.loadPlugins(err))
  }

  loadPlugins (err, localOnly = false) {
    this.updating = false

    // handle errors first
    if (err) {
      console.error(err.stack)
      if (/not a recognized/.test(err.message) || /command not found/.test(err.message)) {
        this.alert(
          'Error updating plugins: We could not find the "npm" command. Make sure it\'s in $PATH'
        )
        return
      }

      this.alert(`Error updating plugins: Check '${this.path}/npm-debug.log' for more information.`)
      return
    }

    // update state with latest plugins
    this.state.saved.plugins = this.plugins

    // cache modules
    this.modules = this.requirePlugins()

    // clear require cache
    this.clearCache()

    // we're done with local plugins
    if (localOnly) return

    // OK, no errors
    // flag successful plugin update
    this.state.saved.installedPlugins = this.id

    // check if package based plugins were updated
    const loaded = this.modules.length
    const total = this.paths.plugins.length
    const pluginVersions = JSON.stringify(this.getPluginVersions())
    const changed = this.state.saved.installedPluginVersions !== pluginVersions && loaded === total
    this.state.saved.installedPluginVersions = pluginVersions

    // notify watchers
    if (this.forceUpdate || changed) {
      this.watchers.forEach(fn => fn(err, {forceUpdate: this.forceUpdate}))
      this.alert('Installation completed')
      log('installation completed')
    }

    // save state
    State.save(this.state)
  }

  getPluginVersions () {
    const paths_ = this.paths.plugins
    return paths_.map(path => {
      let version = null
      try {
        // eslint-disable-next-line import/no-dynamic-require
        version = require(resolve(path, 'package.json')).version
      } catch (err) { }
      return [
        basename(path),
        version
      ]
    })
  }

  clearCache () {
    // trigger unload hooks
    this.modules.forEach(mod => {
      if (mod.onUnload) {
        mod.onUnload(app)
      }
    })

    // clear require cache
    for (const entry in require.cache) {
      if (entry.indexOf(this.path) === 0) {
        delete require.cache[entry]
      }
    }
  }

  isEmptyObject (obj) {
    return (Object.keys(obj).length === 0)
  }

  syncPackageJSON () {
    const dependencies = this.toDependencies(this.plugins)
    const pkg = {
      name: 'webtorrent-plugins',
      description: 'Auto-generated from WebTorrent config.',
      private: true,
      version: '0.0.1',
      repository: 'feross/webtorrent-desktop',
      license: 'MIT',
      homepage: 'https://webtorrent.io',
      dependencies
    }

    const file = resolve(this.path, 'package.json')
    try {
      writeFileSync(file, JSON.stringify(pkg, null, 2))
      return true
    } catch (err) {
      this.alert(`An error occurred writing to ${file}`)
    }
  }

  alert (message) {
    notifier.notify({
      title: 'WebTorrent Plugins',
      // icon: config.icon, // TODO: save icon in webtorrent local folder and set config.icon
      message: message
    })
  }

  isLocalPath (string) {
    // matches unix and windows local paths
    return string.match(/^(\/|[a-z]:\/)/i)
  }

  toDependencies (plugins) {
    const obj = {}
    const pluginNames = Object.keys(plugins)

    pluginNames.forEach(name => {
      let url = plugins[name]
      if (this.isLocalPath(url)) return
      obj[name] = url
    })
    return obj
  }

  installPackages (fn) {
    const {shell = '', npmRegistry} = config

    shellEnv(shell).then(env => {
      if (npmRegistry) {
        env.NPM_CONFIG_REGISTRY = npmRegistry
      }
      /* eslint-disable camelcase  */
      env.npm_config_runtime = 'electron'
      env.npm_config_target = process.versions.electron
      env.npm_config_disturl = 'https://atom.io/download/atom-shell'
      /* eslint-enable camelcase  */
      // Shell-specific installation commands
      const installCommands = {
        fish: 'npm prune; and npm install --production',
        posix: 'npm prune && npm install --production'
      }
      // determine the shell we're running in
      const whichShell = shell.match(/fish/) ? 'fish' : 'posix'

      // Use the install command that is appropriate for our shell
      exec(installCommands[whichShell], {
        cwd: this.path
      }, err => {
        if (err) return fn(err)
        fn(null)
      })
    }).catch(fn)
  }

  subscribe (fn) {
    this.watchers.push(fn)
    return () => {
      this.watchers.splice(this.watchers.indexOf(fn), 1)
    }
  }

  getPaths (plugins) {
    const pluginNames = Object.keys(plugins)

    return {
      plugins: pluginNames.map(name => {
        let url = plugins[name]

        // plugin is already on a local folder
        // directly load it from its current location
        if (this.isLocalPath(url)) return url

        // plugin will be installed with npm install from a remote url
        return resolve(this.path, 'node_modules', name.split('#')[0])
      })
    }
  }

  requirePlugins () {
    const {plugins} = this.paths
    let installNeeded = false

    const load = (path) => {
      let mod
      if (!path.match(/\/$/)) {
        path += '/'
      }

      try {
        // eslint-disable-next-line import/no-dynamic-require
        mod = require(path)
        const exposed = mod && Object.keys(mod).some(key => this.availableExtensions.has(key))
        if (!exposed) {
          this.alert(`Plugin error: Plugin "${basename(path)}" does not expose any ` +
            'WebTorrent extension API methods')
          return
        }

        // populate the name for internal errors here
        mod._name = basename(path)

        return mod
      } catch (err) {
        log('Require plugins ERROR:', err)
        this.alert(`Error loading plugin: ${path}`)
        // plugin not installed
        // node_modules removed? did a manual plugin uninstall?
        // try installing and then loading if successfull
        installNeeded = true
      }
    }

    if (installNeeded) this.updatePlugins()
    return plugins.map(load).filter(v => Boolean(v))
  }

  onApp (app) {
    this.modules.forEach(plugin => {
      if (plugin.onApp) {
        plugin.onApp(app)
      }
    })
  }

  onWindow (win) {
    this.modules.forEach(plugin => {
      if (plugin.onWindow) {
        plugin.onWindow(win)
      }
    })
  }

  // decorates the base object by calling plugin[key]
  // for all the available plugins
  decorateObject (base, key) {
    let decorated = base
    this.modules.forEach(plugin => {
      if (plugin[key]) {
        const res = plugin[key](decorated)
        if (res && typeof res === 'object') {
          decorated = res
        } else {
          this.alert(`Plugin error: "${plugin._name}": invalid return type for \`${key}\``)
        }
      }
    })

    return decorated
  }

  decorateMenu (tpl) {
    return this.decorateObject(tpl, 'decorateMenu')
  }

  decorateWindow (options) {
    return this.decorateObject(options, 'decorateWindow')
  }

  getDecoratedEnv (baseEnv) {
    return this.decorateObject(baseEnv, 'decorateEnv')
  }

  getDecoratedConfig () {
    const baseConfig = config.getConfig()
    return this.decorateObject(baseConfig, 'decorateConfig')
  }

  getDecoratedBrowserOptions (defaults) {
    return this.decorateObject(defaults, 'decorateBrowserOptions')
  }
}

/**
 * Logs passed arguments to console using a prefix.
 *
 */
function log () {
  const prefix = '[ PLUGINS ]-->'
  const args = [prefix]

  for (var i = 0; i < arguments.length; ++i) {
    args.push(arguments[i])
  }

  console.log.apply(console, args)
}
