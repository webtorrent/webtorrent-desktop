const {exec} = require('child_process')
const {resolve, basename} = require('path')
const {writeFileSync} = require('fs')
const State = require('./renderer/lib/state')

const {app, dialog} = require('electron')
const {sync: mkdirpSync} = require('mkdirp')
const ms = require('ms')
const shellEnv = require('shell-env')
const crypto = require('crypto')

const config = require('./config')

module.exports = class Plugins {
  constructor () {
    console.log('-- constructing plugins')

    // modules path
    this.path = resolve(config.getConfigPath(), 'webtorrent-plugins')
    console.log('- plugins path: ', this.path)
    this.availableExtensions = new Set([
      'onApp', 'onWindow', 'onRendererWindow', 'onUnload', 'middleware',
      'reduceUI', 'reduceSessions', 'reduceTermGroups',
      'decorateMenu', 'decorateTerm', 'decorateWindow',
      'decorateTab', 'decorateNotification', 'decorateNotifications',
      'decorateTabs', 'decorateConfig', 'decorateEnv',
      'decorateTermGroup', 'getTermProps',
      'getTabProps', 'getTabsProps', 'getTermGroupProps',
      'mapTermsState', 'mapHeaderState', 'mapNotificationsState',
      'mapTermsDispatch', 'mapHeaderDispatch', 'mapNotificationsDispatch'
    ])

    this.forceUpdate = false
    this.updating = false
    this.watchers = []
  }

  init (state) {
    console.log('-- initializing plugins')
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
          this.id = id
          this.plugins = plugins
          this.updatePlugins()
        }
      }
    })

    // we schedule the initial plugins update
    // a bit after the user launches the terminal
    // to prevent slowness
    // TODO: handle force updates
    if (this.state.saved.installedPlugins !== this.id) {
      // install immediately if the user changed plugins
      console.log('plugins have changed / not init, scheduling plugins installation')
      setTimeout(() => {
        this.updatePlugins()
      }, 5000)
    }

    // otherwise update plugins every 5 hours
    setInterval(this.updatePlugins, ms('5h'))

    console.log(`
      -- id: ${this.id}
      -- installedPlugins: ${this.state.saved.installedPlugins})}
    `)
  }

  getId (plugins) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(plugins));
    return hash.digest('hex')
    // return JSON.stringify(plugins)
  }

  updatePlugins (forceUpdate = false) {
    console.log('-- update plugins')
    this.forceUpdate = forceUpdate
    if (this.updating) {
      // TODO
      // return notify('Plugin update in progress')
    }
    this.updating = true
    const hasPackages = this.syncPackageJSON()

    // there are plugins loaded from repositories
    // npm install must run for these ones
    if (hasPackages) {
      this.installPackages((err) => this.loadPlugins(err))
      return
    }

    // only local plugins to be loaded
    this.loadPlugins(null, true)
  }

  loadPlugins (err, localOnly = false) {
    console.log('- loadPlugins')
    this.updating = false

    // handle errors first
    if (err) {
      console.error(err.stack)
      if (/not a recognized/.test(err.message) || /command not found/.test(err.message)) {
        this.alert(
          'Error updating plugins: We could not find the `npm` command. Make sure it\'s in $PATH'
        )
        return
      }

      this.alert(
        'Error updating plugins: Check `~/.webtorrent_plugins/npm-debug.log` for more information.'
      )
      return
    }

    // cache paths
    // this.paths = this.getPaths(this.plugins)

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
    console.log('-- pluginVersions: ', pluginVersions)
    const changed = this.state.saved.installedPluginVersions !== pluginVersions && loaded === total
    this.state.saved.installedPluginVersions = pluginVersions

    // notify watchers
    if (this.forceUpdate || changed) {
      console.log(`- notify watchers: this.forceUpdate: ${this.forceUpdate} / changed: ${changed}`)
      if (changed) {
        // this.alert(
        //   'Plugins Updated: Restart the app or hot-reload with "View" > "Reload" to enjoy the updates!'
        // )
      } else {
        this.alert(
          'Plugins Updated: No changes!'
        )
      }
      this.watchers.forEach(fn => fn(err, {forceUpdate: this.forceUpdate}))
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
    console.log('- syncPackageJSON')
    const dependencies = this.toDependencies(this.plugins)
    if (this.isEmptyObject(dependencies)) return false

    console.log('- set plugins package file')
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
    console.log(`[ PLUGINS MSG ]--> ${message}`)
    // dialog.showMessageBox({
    //   message,
    //   buttons: ['Ok']
    // })
  }

  isLocalPath (string) {
    // matches unix and windows local paths
    return string.match(/^(\/|[a-z]:\/)/i)
  }

  toDependencies (plugins) {
    console.log('- toDependencies: plugins: ', plugins)
    const obj = {}
    const pluginNames = Object.keys(plugins)

    pluginNames.forEach(name => {
      let url = plugins[name]
      if (this.isLocalPath(url)) return

      console.log('- set package as plugin dependency')
      obj[name] = url
    })
    console.log('- dependencies: ', obj)
    return obj
  }

  installPackages (fn) {
    console.log('- installPackages')
    const {shell = '', npmRegistry} = config

    shellEnv(shell).then(env => {
      console.log('- SHELL')
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
      console.log('- installPackages: exec: ', installCommands[whichShell])
      console.log('- install path: ', this.path)
      exec(installCommands[whichShell], {
        cwd: this.path//,
        // env,
        // shell
      }, err => {
        if (err) {
          return fn(err)
        }
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
    console.log('- requirePlugins')
    const {plugins} = this.paths
    console.log('- requirePlugins: paths: ', plugins)

    const load = (path) => {
      let mod
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
        console.log('- plugin not installed: ', path)
        // plugin not installed
        // node_modules removed? did a manual plugin uninstall?
        // try installing and then loading if successfull
        this.installPackages((err) => this.loadPlugins(err))

        // console.error(err)
        // this.alert(`Plugin error: Plugin "${basename(path)}" failed to load (${err.message})`)
      }
    }

    return plugins.map(load)
      .filter(v => Boolean(v))
  }

  onApp (app) {
    console.log('-- plugins onApp')
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
    console.log('-- plugins: decorate menu')
    return this.decorateObject(tpl, 'decorateMenu')
  }

  decorateWindow (options) {
    console.log('-- plugins: decorate window')
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
