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

var all = {
  // Build 64 bit binaries only.
  arch: 'x64',

  // The application source directory.
  dir: path.join(__dirname, '..'),

  // The release version of the application. Maps to the `ProductVersion` metadata
  // property on Windows, and `CFBundleShortVersionString` on OS X.
  'app-version': pkg.version,

  // Package the application's source code into an archive, using Electron's archive
  // format. Mitigates issues around long path names on Windows and slightly speeds up
  // require().
  asar: true,

  // The build version of the application. Maps to the FileVersion metadata property on
  // Windows, and CFBundleVersion on OS X. We're using the short git hash (e.g. 'e7d837e')
  // Windows requires the build version to start with a number :/ so we stick on a prefix
  'build-version': '0-' + cp.execSync('git rev-parse --short HEAD').toString().replace('\n', ''),

  // Pattern which specifies which files to ignore when copying files to create the
  // package(s).
  ignore: /^\/dist|\/(appveyor.yml|AUTHORS|CONTRIBUTORS|bench|benchmark|benchmark\.js|bin|bower\.json|component\.json|coverage|doc|docs|docs\.mli|dragdrop\.min\.js|example|examples|example\.html|example\.js|externs|ipaddr\.min\.js|Makefile|min|minimist|perf|rusha|simplepeer\.min\.js|simplewebsocket\.min\.js|static\/screenshot\.png|test|tests|test\.js|tests\.js|webtorrent\.min\.js|\.[^\/]*|.*\.md|.*\.markdown)$/,

  // The application name.
  name: config.APP_NAME,

  // The base directory where the finished package(s) are created.
  out: path.join(__dirname, '..', 'dist'),

  // Replace an already existing output directory.
  overwrite: true,

  // Runs `npm prune --production` which remove the packages specified in
  // "devDependencies" before starting to package the app.
  prune: true,

  // The Electron version with which the app is built (without the leading 'v')
  version: pkg.devDependencies['electron-prebuilt']
}

var darwin = {
  platform: 'darwin',

  // The bundle identifier to use in the application's plist (OS X only).
  'app-bundle-id': 'io.webtorrent.app',

  // The application category type, as shown in the Finder via "View" -> "Arrange by
  // Application Category" when viewing the Applications directory (OS X only).
  'app-category-type': 'public.app-category.utilities',

  // The bundle identifier to use in the application helper's plist (OS X only).
  'helper-bundle-id': 'io.webtorrent.app.helper',

  // Application icon.
  icon: path.join(__dirname, '..', 'static', 'WebTorrent.icns')
}

var win32 = {
  platform: 'win32',

  // Object hash of application metadata to embed into the executable (Windows only)
  'version-string': {

    // Company that produced the file.
    CompanyName: config.APP_NAME,

    // Copyright notices that apply to the file. This should include the full text of all
    // notices, legal symbols, copyright dates, and so on.
    LegalCopyright: fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8'),

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
  icon: path.join(__dirname, '..', 'static', 'WebTorrent.ico')
}

var linux = {
  platform: 'linux'

  // Note: Application icon for Linux is specified via the BrowserWindow `icon` option.
}

var platform = process.argv[2]

if (platform === '--darwin') {
  buildDarwin(postDarwinism)
} else if (platform === '--win32') {
  buildWin32()
} else if (platform === '--linux') {
  buildLinux()
} else {
  // Build all
  buildDarwin(() => buildWin32(() => buildLinux()))
}

function buildDarwin (cb) {
  electronPackager(Object.assign({}, all, darwin), done.bind(null, cb))
}

function buildWin32 (cb) {
  electronPackager(Object.assign({}, all, win32), done.bind(null, cb))
}

function buildLinux (cb) {
  electronPackager(Object.assign({}, all, linux), done.bind(null, cb))
}

function postDarwinism () {
  var plist = require('plist')
  var contentsPath = path.join.apply(null, [
    __dirname,
    '..',
    'dist',
    `${config.APP_NAME}-darwin-x64`,
    `${config.APP_NAME}.app`,
    'Contents'
  ])
  var resourcesPath = path.join(contentsPath, 'Resources')
  var infoPlistPath = path.join(contentsPath, 'Info.plist')
  var webTorrentFileIconPath = path.join.apply(null, [
    __dirname,
    '..',
    'static',
    'WebTorrentFile.icns'
  ])
  var infoPlist = plist.parse(fs.readFileSync(infoPlistPath).toString())

  infoPlist['CFBundleDocumentTypes'] = [{
    CFBundleTypeExtensions: [ 'torrent' ],
    CFBundleTypeName: 'BitTorrent Document',
    CFBundleTypeRole: 'Editor',
    CFBundleTypeIconFile: 'WebTorrentFile.icns'
  }]

  fs.writeFileSync(infoPlistPath, plist.build(infoPlist))
  cp.execSync(`cp ${webTorrentFileIconPath} ${resourcesPath}`)
}

function done (cb, err, appPath) {
  if (err) console.error(err.message || err)
  else console.log('Built ' + appPath)
  if (cb) cb()
}
