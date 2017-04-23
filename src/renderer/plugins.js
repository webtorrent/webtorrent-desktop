const {resolve, basename} = require('path')
const notifier = require('node-notifier')
const crypto = require('crypto')

const config = require('../config')

module.exports = class Plugins {
  constructor () {
    // modules path
    this.path = resolve(config.getConfigPath(), 'plugins')
    log('Path: ', this.path)
    this.availableExtensions = [
      'onCheckForSubtitles'
    ]

    this.forceUpdate = false
    this.updating = false
    this.watchers = []
    this.state = {}
  }

  init (params) {
    this.state = params.state

    // initialize state
    this.state.saved = Object.assign(this.state.saved || {})

    // caches
    this.plugins = config.getPlugins()
    this.paths = this.getPaths(this.plugins)
    this.id = this.getId(this.plugins)
    this.modules = this.requirePlugins()

    // TODO: fire an event when plugins finish updating and listen to that.
    // Listen to plugin changes on config.
    // New plugins added, plugins removed or updated.
    // The actual plugin update action will take place in the MAIN process.
    config.subscribe(() => {
      const plugins = config.getPlugins()
      if (plugins !== this.plugins) {
        const id = this.getId(plugins)
        if (this.id !== id) {
          log('UPDATING...')
          this.id = id
          this.plugins = plugins
          this.paths = this.getPaths(this.plugins)
        }
      }
    })

    // Plugins will be updated on the MAIN process after 5s.
    if (this.needsUpdate()) {
      setTimeout(() => {
        this.init(params)
      }, 6000)
      log('Plugins need update, init scheduled')
      return
    }

    this.loadPlugins()
    this.initPlugins(params)
  }

  initPlugins (params) {
    this.modules.forEach(plugin => {
      if (plugin.init) {
        plugin.init(params)
      }
    })
  }

  on (action, params) {
    log(`ON ${action}:`, params)
    this.modules.forEach(plugin => {
      const actionName = this.capitalizeFirstLetter(action)
      const methodName = `on${actionName}`
      if (typeof plugin[methodName] === 'function') {
        plugin[methodName](params)
      }
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

  alert (message) {
    notifier.notify({
      title: 'WebTorrent Plugins',
      // icon: config.icon, // TODO: save icon in webtorrent local folder and set config.icon
      message: message
    })
  }

  subscribe (fn) {
    this.watchers.push(fn)
    return () => {
      this.watchers.splice(this.watchers.indexOf(fn), 1)
    }
  }

  isLocalPath (string) {
    // matches unix and windows local paths
    return string.match(/^(\/|[a-z]:\/)/i)
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

  exposesSupportedApi (plugin) {
    if (!plugin) return false

    return this.availableExtensions.some((methodName) => {
      return (typeof plugin[methodName] === 'function')
    })
  }

  requirePlugins () {
    const {plugins} = this.paths
    let installNeeded = false

    const load = (path) => {
      if (!path.match(/\/$/)) {
        path += '/'
      }

      const rendererPath = `${path}renderer.js`

      try {
        const Plugin = require(rendererPath) // eslint-disable import/no-dynamic-require
        const plugin = new Plugin()

        const exposed = this.exposesSupportedApi(plugin)
        if (!exposed) {
          log('Plugin not exposing any available extensions.', rendererPath, Object.keys(plugin))
          return
        }

        // populate the name for internal errors here
        plugin._name = basename(rendererPath)

        return plugin
      } catch (err) {
        log('Require plugins ERROR:', err)
        this.alert(`Error loading plugin: ${rendererPath}`)
        // plugin not installed
        // node_modules removed? did a manual plugin uninstall?
        // try installing and then loading if successfull
        installNeeded = true
      }
    }

    // Plugin installation happens on the MAIN process.
    // If plugins haven't finished installing, wait for them.
    if (installNeeded) {
      log('Plugins install needed, wait...')
      setTimeout(() => {
        this.requirePlugins()
      }, 3000)
    }
    return plugins.map(load).filter(v => Boolean(v))
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
}

/**
 * Logs passed arguments to console using a prefix.
 *
 */
function log () {
  const prefix = '[ PLUGINS.Renderer ]-->'
  const args = [prefix]

  for (var i = 0; i < arguments.length; ++i) {
    args.push(arguments[i])
  }

  console.log.apply(console, args)
}
