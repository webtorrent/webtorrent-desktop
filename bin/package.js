#!/usr/bin/env node

/**
 * Builds app binaries for Mac, Windows, and Linux.
 */

const cp = require('child_process')
const electronPackager = require('electron-packager')
const fs = require('fs')
const minimist = require('minimist')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
const series = require('run-series')
const zip = require('cross-zip')

const config = require('../src/config')
const pkg = require('../package.json')

const BUILD_NAME = config.APP_NAME + '-v' + config.APP_VERSION
const BUILD_PATH = path.join(config.ROOT_PATH, 'build')
const DIST_PATH = path.join(config.ROOT_PATH, 'dist')
const NODE_MODULES_PATH = path.join(config.ROOT_PATH, 'node_modules')

const argv = minimist(process.argv.slice(2), {
  boolean: [
    'sign'
  ],
  default: {
    package: 'all',
    sign: false
  },
  string: [
    'package'
  ]
})

function build () {
  console.log('Installing node_modules...')
  rimraf.sync(NODE_MODULES_PATH)
  cp.execSync('npm ci', { stdio: 'inherit' })

  console.log('Nuking dist/ and build/...')
  rimraf.sync(DIST_PATH)
  rimraf.sync(BUILD_PATH)

  console.log('Build: Transpiling to ES5...')
  cp.execSync('npm run build', { NODE_ENV: 'production', stdio: 'inherit' })
  console.log('Build: Transpiled to ES5.')

  const platform = argv._[0]
  if (platform === 'darwin') {
    buildDarwin(printDone)
  } else if (platform === 'win32') {
    buildWin32(printDone)
  } else if (platform === 'linux') {
    buildLinux(printDone)
  } else {
    buildDarwin(function (err) {
      printDone(err)
      buildWin32(function (err) {
        printDone(err)
        buildLinux(printDone)
      })
    })
  }
}

const all = {
  // The human-readable copyright line for the app. Maps to the `LegalCopyright` metadata
  // property on Windows, and `NSHumanReadableCopyright` on Mac.
  appCopyright: config.APP_COPYRIGHT,

  // The release version of the application. Maps to the `ProductVersion` metadata
  // property on Windows, and `CFBundleShortVersionString` on Mac.
  appVersion: pkg.version,

  // Package the application's source code into an archive, using Electron's archive
  // format. Mitigates issues around long path names on Windows and slightly speeds up
  // require().
  asar: {
    // A glob expression, that unpacks the files with matching names to the
    // "app.asar.unpacked" directory.
    unpack: 'WebTorrent*'
  },

  // The build version of the application. Maps to the FileVersion metadata property on
  // Windows, and CFBundleVersion on Mac. Note: Windows requires the build version to
  // start with a number. We're using the version of the underlying WebTorrent library.
  buildVersion: require('webtorrent/package.json').version,

  // The application source directory.
  dir: config.ROOT_PATH,

  // Pattern which specifies which files to ignore when copying files to create the
  // package(s).
  ignore: /^\/src|^\/dist|\/(appveyor.yml|\.appveyor.yml|\.github|appdmg|AUTHORS|CONTRIBUTORS|bench|benchmark|benchmark\.js|bin|bower\.json|component\.json|coverage|doc|docs|docs\.mli|dragdrop\.min\.js|example|examples|example\.html|example\.js|externs|ipaddr\.min\.js|Makefile|min|minimist|perf|rusha|simplepeer\.min\.js|simplewebsocket\.min\.js|static\/screenshot\.png|test|tests|test\.js|tests\.js|webtorrent\.min\.js|\.[^/]*|.*\.md|.*\.markdown)$/,

  // The application name.
  name: config.APP_NAME,

  // The base directory where the finished package(s) are created.
  out: DIST_PATH,

  // Replace an already existing output directory.
  overwrite: true,

  // Runs `npm prune --production` which remove the packages specified in
  // "devDependencies" before starting to package the app.
  prune: true,

  // The Electron version that the app is built with (without the leading 'v')
  electronVersion: require('electron/package.json').version
}

const darwin = {
  // Build for Mac
  platform: 'darwin',

  // Build x64 binary only.
  arch: 'x64',

  // The bundle identifier to use in the application's plist (Mac only).
  appBundleId: 'io.webtorrent.webtorrent',

  // The application category type, as shown in the Finder via "View" -> "Arrange by
  // Application Category" when viewing the Applications directory (Mac only).
  appCategoryType: 'public.app-category.utilities',

  // The bundle identifier to use in the application helper's plist (Mac only).
  helperBundleId: 'io.webtorrent.webtorrent-helper',

  // Application icon.
  icon: config.APP_ICON + '.icns'
}

const win32 = {
  // Build for Windows.
  platform: 'win32',

  // Build x64 binary only.
  arch: 'x64',

  // Object hash of application metadata to embed into the executable (Windows only)
  win32metadata: {

    // Company that produced the file.
    CompanyName: config.APP_NAME,

    // Name of the program, displayed to users
    FileDescription: config.APP_NAME,

    // Original name of the file, not including a path. This information enables an
    // application to determine whether a file has been renamed by a user. The format of
    // the name depends on the file system for which the file was created.
    OriginalFilename: config.APP_NAME + '.exe',

    // Name of the product with which the file is distributed.
    ProductName: config.APP_NAME,

    // Internal name of the file, if one exists, for example, a module name if the file
    // is a dynamic-link library. If the file has no internal name, this string should be
    // the original filename, without extension. This string is required.
    InternalName: config.APP_NAME
  },

  // Application icon.
  icon: config.APP_ICON + '.ico'
}

const linux = {
  // Build for Linux.
  platform: 'linux',

  // Build x64 and arm64 binaries.
  arch: ['x64', 'arm64']

  // Note: Application icon for Linux is specified via the BrowserWindow `icon` option.
}

build()

function buildDarwin (cb) {
  const plist = require('plist')

  console.log('Mac: Packaging electron...')
  electronPackager(Object.assign({}, all, darwin)).then(function (buildPath) {
    console.log('Mac: Packaged electron. ' + buildPath)

    const appPath = path.join(buildPath[0], config.APP_NAME + '.app')
    const contentsPath = path.join(appPath, 'Contents')
    const resourcesPath = path.join(contentsPath, 'Resources')
    const infoPlistPath = path.join(contentsPath, 'Info.plist')
    const infoPlist = plist.parse(fs.readFileSync(infoPlistPath, 'utf8'))

    infoPlist.CFBundleDocumentTypes = [
      {
        CFBundleTypeExtensions: ['torrent'],
        CFBundleTypeIconFile: path.basename(config.APP_FILE_ICON) + '.icns',
        CFBundleTypeName: 'BitTorrent Document',
        CFBundleTypeRole: 'Editor',
        LSHandlerRank: 'Owner',
        LSItemContentTypes: ['org.bittorrent.torrent']
      },
      {
        CFBundleTypeName: 'Any',
        CFBundleTypeOSTypes: ['****'],
        CFBundleTypeRole: 'Editor',
        LSHandlerRank: 'Owner',
        LSTypeIsPackage: false
      }
    ]

    infoPlist.CFBundleURLTypes = [
      {
        CFBundleTypeRole: 'Editor',
        CFBundleURLIconFile: path.basename(config.APP_FILE_ICON) + '.icns',
        CFBundleURLName: 'BitTorrent Magnet URL',
        CFBundleURLSchemes: ['magnet']
      },
      {
        CFBundleTypeRole: 'Editor',
        CFBundleURLIconFile: path.basename(config.APP_FILE_ICON) + '.icns',
        CFBundleURLName: 'BitTorrent Stream-Magnet URL',
        CFBundleURLSchemes: ['stream-magnet']
      }
    ]

    infoPlist.UTExportedTypeDeclarations = [
      {
        UTTypeConformsTo: [
          'public.data',
          'public.item',
          'com.bittorrent.torrent'
        ],
        UTTypeDescription: 'BitTorrent Document',
        UTTypeIconFile: path.basename(config.APP_FILE_ICON) + '.icns',
        UTTypeIdentifier: 'org.bittorrent.torrent',
        UTTypeReferenceURL: 'http://www.bittorrent.org/beps/bep_0000.html',
        UTTypeTagSpecification: {
          'com.apple.ostype': 'TORR',
          'public.filename-extension': ['torrent'],
          'public.mime-type': 'application/x-bittorrent'
        }
      }
    ]

    fs.writeFileSync(infoPlistPath, plist.build(infoPlist))

    // Copy torrent file icon into app bundle
    cp.execSync(`cp ${config.APP_FILE_ICON + '.icns'} ${resourcesPath}`)

    if (process.platform === 'darwin') {
      if (argv.sign) {
        signApp(function (err) {
          if (err) return cb(err)
          pack(cb)
        })
      } else {
        printWarning()
        pack(cb)
      }
    } else {
      printWarning()
    }

    function signApp (cb) {
      const sign = require('electron-osx-sign')

      /*
       * Sign the app with Apple Developer ID certificates. We sign the app for 2 reasons:
       *   - So the auto-updater (Squirrrel.Mac) can check that app updates are signed by
       *     the same author as the current version.
       *   - So users will not a see a warning about the app coming from an "Unidentified
       *     Developer" when they open it for the first time (Mac Gatekeeper).
       *
       * To sign an Mac app for distribution outside the App Store, the following are
       * required:
       *   - Xcode
       *   - Xcode Command Line Tools (xcode-select --install)
       *   - Membership in the Apple Developer Program
       */
      const signOpts = {
        app: appPath,
        platform: 'darwin',
        verbose: true
      }

      console.log('Mac: Signing app...')
      sign(signOpts, function (err) {
        if (err) return cb(err)
        console.log('Mac: Signed app.')
        cb(null)
      })
    }

    function pack (cb) {
      packageZip() // always produce .zip file, used for automatic updates

      if (argv.package === 'dmg' || argv.package === 'all') {
        packageDmg(cb)
      }
    }

    function packageZip () {
      // Create .zip file (used by the auto-updater)
      console.log('Mac: Creating zip...')

      const inPath = path.join(buildPath[0], config.APP_NAME + '.app')
      const outPath = path.join(DIST_PATH, BUILD_NAME + '-darwin.zip')
      zip.zipSync(inPath, outPath)

      console.log('Mac: Created zip.')
    }

    function packageDmg (cb) {
      console.log('Mac: Creating dmg...')

      const appDmg = require('appdmg')

      const targetPath = path.join(DIST_PATH, BUILD_NAME + '.dmg')
      rimraf.sync(targetPath)

      // Create a .dmg (Mac disk image) file, for easy user installation.
      const dmgOpts = {
        basepath: config.ROOT_PATH,
        target: targetPath,
        specification: {
          title: config.APP_NAME,
          icon: config.APP_ICON + '.icns',
          background: path.join(config.STATIC_PATH, 'appdmg.png'),
          'icon-size': 128,
          contents: [
            { x: 122, y: 240, type: 'file', path: appPath },
            { x: 380, y: 240, type: 'link', path: '/Applications' },
            // Hide hidden icons out of view, for users who have hidden files shown.
            // https://github.com/LinusU/node-appdmg/issues/45#issuecomment-153924954
            { x: 50, y: 500, type: 'position', path: '.background' },
            { x: 100, y: 500, type: 'position', path: '.DS_Store' },
            { x: 150, y: 500, type: 'position', path: '.Trashes' },
            { x: 200, y: 500, type: 'position', path: '.VolumeIcon.icns' }
          ]
        }
      }

      const dmg = appDmg(dmgOpts)
      dmg.once('error', cb)
      dmg.on('progress', function (info) {
        if (info.type === 'step-begin') console.log(info.title + '...')
      })
      dmg.once('finish', function (info) {
        console.log('Mac: Created dmg.')
        cb(null)
      })
    }
  }).catch(function (err) {
    cb(err)
  })
}

function buildWin32 (cb) {
  const installer = require('electron-winstaller')
  console.log('Windows: Packaging electron...')

  /*
   * Path to folder with the following files:
   *   - Windows Authenticode private key and cert (authenticode.p12)
   *   - Windows Authenticode password file (authenticode.txt)
   */
  let CERT_PATH
  try {
    fs.accessSync('D:')
    CERT_PATH = 'D:'
  } catch (err) {
    CERT_PATH = path.join(os.homedir(), 'Desktop')
  }

  electronPackager(Object.assign({}, all, win32)).then(function (buildPath) {
    console.log('Windows: Packaged electron. ' + buildPath)

    let signWithParams
    if (process.platform === 'win32') {
      if (argv.sign) {
        const certificateFile = path.join(CERT_PATH, 'authenticode.p12')
        const certificatePassword = fs.readFileSync(path.join(CERT_PATH, 'authenticode.txt'), 'utf8')
        const timestampServer = 'http://timestamp.comodoca.com'
        signWithParams = `/a /f "${certificateFile}" /p "${certificatePassword}" /tr "${timestampServer}" /td sha256`
      } else {
        printWarning()
      }
    } else {
      printWarning()
    }

    const tasks = []
    buildPath.forEach(function (filesPath) {
      if (argv.package === 'exe' || argv.package === 'all') {
        tasks.push((cb) => packageInstaller(filesPath, cb))
      }
      if (argv.package === 'portable' || argv.package === 'all') {
        tasks.push((cb) => packagePortable(filesPath, cb))
      }
    })
    series(tasks, cb)

    function packageInstaller (filesPath, cb) {
      console.log('Windows: Creating installer...')

      installer.createWindowsInstaller({
        appDirectory: filesPath,
        authors: config.APP_TEAM,
        description: config.APP_NAME,
        exe: config.APP_NAME + '.exe',
        iconUrl: config.GITHUB_URL_RAW + '/static/' + config.APP_NAME + '.ico',
        loadingGif: path.join(config.STATIC_PATH, 'loading.gif'),
        name: config.APP_NAME,
        noMsi: true,
        outputDirectory: DIST_PATH,
        productName: config.APP_NAME,
        // TODO: Re-enable Windows 64-bit delta updates when we confirm that they
        //       work correctly in the presence of the "ia32" .nupkg files. I
        //       (feross) noticed them listed in the 64-bit RELEASES file and
        //       manually edited them out for the v0.17 release. Shipping only
        //       full updates for now will work fine, with no ill-effects.
        // remoteReleases: config.GITHUB_URL,
        /**
         * If you hit a "GitHub API rate limit exceeded" error, set this token!
         */
        // remoteToken: process.env.WEBTORRENT_GITHUB_API_TOKEN,
        setupExe: config.APP_NAME + 'Setup-v' + config.APP_VERSION + '.exe',
        setupIcon: config.APP_ICON + '.ico',
        signWithParams,
        title: config.APP_NAME,
        usePackageJson: false,
        version: pkg.version
      })
        .then(function () {
          console.log('Windows: Created installer.')

          /**
         * Delete extraneous Squirrel files (i.e. *.nupkg delta files for older
         * versions of the app)
         */
          fs.readdirSync(DIST_PATH)
            .filter((name) => name.endsWith('.nupkg') && !name.includes(pkg.version))
            .forEach((filename) => {
              fs.unlinkSync(path.join(DIST_PATH, filename))
            })

          cb(null)
        })
        .catch(cb)
    }

    function packagePortable (filesPath, cb) {
      console.log('Windows: Creating portable app...')

      const portablePath = path.join(filesPath, 'Portable Settings')
      fs.mkdirSync(portablePath, { recursive: true })

      const downloadsPath = path.join(portablePath, 'Downloads')
      fs.mkdirSync(downloadsPath, { recursive: true })

      const tempPath = path.join(portablePath, 'Temp')
      fs.mkdirSync(tempPath, { recursive: true })

      const inPath = path.join(DIST_PATH, path.basename(filesPath))
      const outPath = path.join(DIST_PATH, BUILD_NAME + '-win.zip')
      zip.zipSync(inPath, outPath)

      console.log('Windows: Created portable app.')
      cb(null)
    }
  }).catch(function (err) {
    cb(err)
  })
}

function buildLinux (cb) {
  console.log('Linux: Packaging electron...')

  electronPackager(Object.assign({}, all, linux)).then(function (buildPath) {
    console.log('Linux: Packaged electron. ' + buildPath)

    const tasks = []
    buildPath.forEach(function (filesPath) {
      const destArch = filesPath.split('-').pop()

      if (argv.package === 'deb' || argv.package === 'all') {
        tasks.push((cb) => packageDeb(filesPath, destArch, cb))
      }
      if (argv.package === 'rpm' || argv.package === 'all') {
        tasks.push((cb) => packageRpm(filesPath, destArch, cb))
      }
      if (argv.package === 'zip' || argv.package === 'all') {
        tasks.push((cb) => packageZip(filesPath, destArch, cb))
      }
    })
    series(tasks, cb)
  }).catch(function (err) {
    cb(err)
  })

  function packageDeb (filesPath, destArch, cb) {
    // Linux convention for Debian based 'x64' is 'amd64'
    if (destArch === 'x64') {
      destArch = 'amd64'
    }

    // Create .deb file for Debian-based platforms
    console.log(`Linux: Creating ${destArch} deb...`)

    const installer = require('electron-installer-debian')

    const options = {
      src: filesPath + '/',
      dest: DIST_PATH,
      arch: destArch,
      bin: 'WebTorrent',
      icon: {
        '48x48': path.join(config.STATIC_PATH, 'linux/share/icons/hicolor/48x48/apps/webtorrent-desktop.png'),
        '256x256': path.join(config.STATIC_PATH, 'linux/share/icons/hicolor/256x256/apps/webtorrent-desktop.png')
      },
      categories: ['Network', 'FileTransfer', 'P2P'],
      mimeType: ['application/x-bittorrent', 'x-scheme-handler/magnet', 'x-scheme-handler/stream-magnet'],
      desktopTemplate: path.join(config.STATIC_PATH, 'linux/webtorrent-desktop.ejs')
    }

    installer(options).then(
      () => {
        console.log(`Linux: Created ${destArch} deb.`)
        cb(null)
      },
      (err) => cb(err)
    )
  }

  function packageRpm (filesPath, destArch, cb) {
    // Linux convention for RedHat based 'x64' is 'x86_64'
    if (destArch === 'x64') {
      destArch = 'x86_64'
    }

    // Create .rpm file for RedHat-based platforms
    console.log(`Linux: Creating ${destArch} rpm...`)

    const installer = require('electron-installer-redhat')

    const options = {
      src: filesPath + '/',
      dest: DIST_PATH,
      arch: destArch,
      bin: 'WebTorrent',
      icon: {
        '48x48': path.join(config.STATIC_PATH, 'linux/share/icons/hicolor/48x48/apps/webtorrent-desktop.png'),
        '256x256': path.join(config.STATIC_PATH, 'linux/share/icons/hicolor/256x256/apps/webtorrent-desktop.png')
      },
      categories: ['Network', 'FileTransfer', 'P2P'],
      mimeType: ['application/x-bittorrent', 'x-scheme-handler/magnet', 'x-scheme-handler/stream-magnet'],
      desktopTemplate: path.join(config.STATIC_PATH, 'linux/webtorrent-desktop.ejs')
    }

    installer(options).then(
      () => {
        console.log(`Linux: Created ${destArch} rpm.`)
        cb(null)
      },
      (err) => cb(err)
    )
  }

  function packageZip (filesPath, destArch, cb) {
    // Create .zip file for Linux
    console.log(`Linux: Creating ${destArch} zip...`)

    const inPath = path.join(DIST_PATH, path.basename(filesPath))
    const outPath = path.join(DIST_PATH, `${BUILD_NAME}-linux-${destArch}.zip`)
    zip.zipSync(inPath, outPath)

    console.log(`Linux: Created ${destArch} zip.`)
    cb(null)
  }
}

function printDone (err) {
  if (err) console.error(err.message || err)
}

/*
 * Print a large warning when signing is disabled so we are less likely to accidentally
 * ship unsigned binaries to users.
 */
function printWarning () {
  console.log(fs.readFileSync(path.join(__dirname, 'warning.txt'), 'utf8'))
}
