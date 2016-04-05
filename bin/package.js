#!/usr/bin/env node

/**
 * Builds app binaries for OS X, Linux, and Windows.
 */

var config = require('../config')
var cp = require('child_process')
var electronPackager = require('electron-packager')
var fs = require('fs')
var path = require('path')
var pkg = require('../package.json')
var rimraf = require('rimraf')

var BUILD_NAME = config.APP_NAME + '-v' + config.APP_VERSION

function build () {
  var platform = process.argv[2]
  var packageType = process.argv.length > 3 ? process.argv[3] : 'all'
  if (platform === 'darwin') {
    buildDarwin(printDone)
  } else if (platform === 'win32') {
    buildWin32(printDone)
  } else if (platform === 'linux') {
    buildLinux(packageType, printDone)
  } else {
    buildDarwin(function (err, buildPath) {
      printDone(err, buildPath)
      buildWin32(function (err, buildPath) {
        printDone(err, buildPath)
        buildLinux(packageType, printDone)
      })
    })
  }
}

var all = {
  // Build 64 bit binaries only.
  arch: 'x64',

  // The human-readable copyright line for the app.
  'app-copyright': config.APP_COPYRIGHT,

  // The release version of the application. Maps to the `ProductVersion` metadata
  // property on Windows, and `CFBundleShortVersionString` on OS X.
  'app-version': pkg.version,

  // Package the application's source code into an archive, using Electron's archive
  // format. Mitigates issues around long path names on Windows and slightly speeds up
  // require().
  asar: true,

  // A glob expression, that unpacks the files with matching names to the
  // "app.asar.unpacked" directory.
  'asar-unpack': 'WebTorrent*',

  // The build version of the application. Maps to the FileVersion metadata property on
  // Windows, and CFBundleVersion on OS X. We're using the short git hash (e.g. 'e7d837e')
  // Windows requires the build version to start with a number :/ so we stick on a prefix
  'build-version': '0-' + cp.execSync('git rev-parse --short HEAD').toString().replace('\n', ''),

  // The application source directory.
  dir: config.ROOT_PATH,

  // Pattern which specifies which files to ignore when copying files to create the
  // package(s).
  ignore: /^\/dist|\/(appveyor.yml|.appveyor.yml|appdmg|AUTHORS|CONTRIBUTORS|bench|benchmark|benchmark\.js|bin|bower\.json|component\.json|coverage|doc|docs|docs\.mli|dragdrop\.min\.js|example|examples|example\.html|example\.js|externs|ipaddr\.min\.js|Makefile|min|minimist|perf|rusha|simplepeer\.min\.js|simplewebsocket\.min\.js|static\/screenshot\.png|test|tests|test\.js|tests\.js|webtorrent\.min\.js|\.[^\/]*|.*\.md|.*\.markdown)$/,

  // The application name.
  name: config.APP_NAME,

  // The base directory where the finished package(s) are created.
  out: path.join(config.ROOT_PATH, 'dist'),

  // Replace an already existing output directory.
  overwrite: true,

  // Runs `npm prune --production` which remove the packages specified in
  // "devDependencies" before starting to package the app.
  prune: true,

  // The Electron version with which the app is built (without the leading 'v')
  version: pkg.dependencies['electron-prebuilt']
}

var darwin = {
  platform: 'darwin',

  // The bundle identifier to use in the application's plist (OS X only).
  'app-bundle-id': 'io.webtorrent.webtorrent',

  // The application category type, as shown in the Finder via "View" -> "Arrange by
  // Application Category" when viewing the Applications directory (OS X only).
  'app-category-type': 'public.app-category.utilities',

  // The bundle identifier to use in the application helper's plist (OS X only).
  'helper-bundle-id': 'io.webtorrent.webtorrent-helper',

  // Application icon.
  icon: config.APP_ICON + '.icns'
}

var win32 = {
  platform: 'win32',

  // Object hash of application metadata to embed into the executable (Windows only)
  'version-string': {

    // Company that produced the file.
    CompanyName: config.APP_NAME,

    // Name of the program, displayed to users
    FileDescription: config.APP_NAME,

    // Original name of the file, not including a path. This information enables an
    // application to determine whether a file has been renamed by a user. The format of
    // the name depends on the file system for which the file was created.
    OriginalFilename: 'WebTorrent.exe',

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

var linux = {
  platform: 'linux'

  // Note: Application icon for Linux is specified via the BrowserWindow `icon` option.
}

build()

function buildDarwin (cb) {
  var plist = require('plist')

  electronPackager(Object.assign({}, all, darwin), function (err, buildPath) {
    if (err) return cb(err)

    var appPath = path.join(buildPath[0], config.APP_NAME + '.app')
    var contentsPath = path.join(appPath, 'Contents')
    var resourcesPath = path.join(contentsPath, 'Resources')
    var infoPlistPath = path.join(contentsPath, 'Info.plist')
    var infoPlist = plist.parse(fs.readFileSync(infoPlistPath, 'utf8'))

    // TODO: Use new `extend-info` and `extra-resource` opts to electron-packager,
    // available as of v6.
    infoPlist.CFBundleDocumentTypes = [
      {
        CFBundleTypeExtensions: [ 'torrent' ],
        CFBundleTypeIconFile: path.basename(config.APP_FILE_ICON) + '.icns',
        CFBundleTypeName: 'BitTorrent Document',
        CFBundleTypeRole: 'Editor',
        LSHandlerRank: 'Owner',
        LSItemContentTypes: [ 'org.bittorrent.torrent' ]
      },
      {
        CFBundleTypeName: 'Any',
        CFBundleTypeOSTypes: [ '****' ],
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
        CFBundleURLSchemes: [ 'magnet' ]
      }
    ]

    fs.writeFileSync(infoPlistPath, plist.build(infoPlist))

    // Copy torrent file icon into app bundle
    cp.execSync(`cp ${config.APP_FILE_ICON + '.icns'} ${resourcesPath}`)

    if (process.platform === 'darwin') {
      var appDmg = require('appdmg')
      var sign = require('electron-osx-sign')

      /*
       * Sign the app with Apple Developer ID certificate. We sign the app for 2 reasons:
       *   - So the auto-updater (Squirrrel.Mac) can check that app updates are signed by
       *     the same author as the current version.
       *   - So users will not a see a warning about the app coming from an "Unidentified
       *     Developer" when they open it for the first time (OS X Gatekeeper).
       *
       * To sign an OS X app for distribution outside the App Store, the following are
       * required:
       *   - Xcode
       *   - Xcode Command Line Tools (xcode-select --install)
       *   - Membership in the Apple Developer Program
       */
      var signOpts = {
        app: appPath,
        platform: 'darwin',
        verbose: true
      }

      sign(signOpts, function (err) {
        if (err) return cb(err)

        // Create .zip file (used by the auto-updater)
        var zipPath = path.join(config.ROOT_PATH, 'dist', BUILD_NAME + '-darwin.zip')
        cp.execSync(`cd ${buildPath[0]} && zip -r -y ${zipPath} ${config.APP_NAME + '.app'}`)
        console.log('Created OS X .zip file.')

        var targetPath = path.join(config.ROOT_PATH, 'dist', BUILD_NAME + '.dmg')
        rimraf.sync(targetPath)

        // Create a .dmg (OS X disk image) file, for easy user installation.
        var dmgOpts = {
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

        var dmg = appDmg(dmgOpts)
        dmg.on('error', cb)
        dmg.on('progress', function (info) {
          if (info.type === 'step-begin') console.log(info.title + '...')
        })
        dmg.on('finish', function (info) {
          console.log('Created OS X disk image (.dmg) file.')
          cb(null, buildPath)
        })
      })
    }
  })
}

function buildWin32 (cb) {
  var installer = require('electron-winstaller')

  electronPackager(Object.assign({}, all, win32), function (err, buildPath) {
    if (err) return cb(err)

    console.log('Creating Windows installer...')
    installer.createWindowsInstaller({
      name: config.APP_NAME,
      productName: config.APP_NAME,
      title: config.APP_NAME,
      exe: config.APP_NAME + '.exe',

      appDirectory: buildPath[0],
      outputDirectory: path.join(config.ROOT_PATH, 'dist'),
      version: pkg.version,
      description: config.APP_NAME,
      authors: config.APP_TEAM,
      iconUrl: config.APP_ICON + '.ico',
      setupIcon: config.APP_ICON + '.ico',
      // certificateFile: '', // TODO
      usePackageJson: false,
      loadingGif: path.join(config.STATIC_PATH, 'loading.gif')
    }).then(function () {
      console.log('Created Windows installer.')
      cb(null, buildPath)
    }).catch(cb)
  })
}

function buildLinux (packageType, cb) {
  electronPackager(Object.assign({}, all, linux), function (err, buildPath) {
    if (err) return cb(err)

    var distPath = path.join(config.ROOT_PATH, 'dist')
    var filesPath = buildPath[0]

    if (packageType === 'deb' || packageType === 'all') {
      // Create .deb file for debian based platforms
      var deb = require('nobin-debian-installer')()
      var destPath = path.join('/opt', pkg.name)

      deb.pack({
        package: pkg,
        info: {
          arch: 'amd64',
          targetDir: distPath,
          scripts: {
            postinst: path.join(config.STATIC_PATH, 'linux', 'postinst'),
            postrm: path.join(config.STATIC_PATH, 'linux', 'postrm')
          }
        }
      }, [{
        src: ['./**'],
        dest: destPath,
        expand: true,
        cwd: filesPath
      }], function (err, done) {
        if (err) return console.error(err.message || err)
        console.log('Created Linux .deb file.')
      })
    }

    if (packageType === 'zip' || packageType === 'all') {
      // Create .zip file for Linux
      var zipPath = path.join(config.ROOT_PATH, 'dist', BUILD_NAME + '-linux.zip')
      var appFolderName = path.basename(filesPath)
      cp.execSync(`cd ${distPath} && zip -r -y ${zipPath} ${appFolderName}`)
      console.log('Created Linux .zip file.')
    }
  })
}

function printDone (err, buildPath) {
  if (err) console.error(err.message || err)
  else console.log('Built ' + buildPath[0])
}
