#!/usr/bin/env node

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
  asar: false,

  // The build version of the application. Maps to the FileVersion metadata property on
  // Windows, and CFBundleVersion on OS X. We're using the short git hash (e.g. 'e7d837e')
  'build-version': cp.execSync('git rev-parse --short HEAD').toString().replace('\n', ''),

  // Pattern which specifies which files to ignore when copying files to create the
  // package(s).
  ignore: /^\/(dist|resources\/screenshot.png)$/,

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
  icon: path.join(__dirname, '..', 'WebTorrent.icns')
}

var win32 = {
  platform: 'win32',

  // Object hash of application metadata to embed into the executable (Windows only)
  'version-string': {

    // Company that produced the file.
    CompanyName: 'WebTorrent',

    // Copyright notices that apply to the file. This should include the full text of all
    // notices, legal symbols, copyright dates, and so on.
    LegalCopyright: fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8'),

    // File description to be presented to users.
    FileDescription: 'Streaming torrent client',

    // Original name of the file, not including a path. This information enables an
    // application to determine whether a file has been renamed by a user. The format of
    // the name depends on the file system for which the file was created.
    OriginalFilename: 'WebTorrent.exe',

    // Name of the product with which the file is distributed.
    ProductName: 'WebTorrent',

    // Internal name of the file, if one exists, for example, a module name if the file
    // is a dynamic-link library. If the file has no internal name, this string should be
    // the original filename, without extension. This string is required.
    InternalName: 'WebTorrent'
  },

  // Application icon.
  icon: path.join(__dirname, '..', 'WebTorrent.ico')
}

var linux = {
  platform: 'linux'

  // Note: Application icon for Linux is specified via the BrowserWindow `icon` option.
}

electronPackager(Object.assign({}, all, darwin), done)
electronPackager(Object.assign({}, all, win32), done)
electronPackager(Object.assign({}, all, linux), done)

function done (err, appPath) {
  if (err) console.error(err.message || err)
  else console.log('Built ' + appPath)
}
