/* eslint-disable camelcase */

module.exports = {
  run
}

var fs = require('fs-extra')
var path = require('path')
var semver = require('semver')

var config = require('../../config')

// Change `state.saved` (which will be saved back to config.json on exit) as
// needed, for example to deal with config.json format changes across versions
function run (state) {
  // Migration: replace "{ version: 1 }" with app version (semver)
  if (!semver.valid(state.saved.version)) {
    state.saved.version = '0.0.0' // Pre-0.7.0 version, so run all migrations
  }

  var version = state.saved.version

  if (semver.lt(version, '0.7.0')) {
    migrate_0_7_0(state)
  }

  // Future migrations...
  // if (semver.lt(version, '0.8.0')) {
  //   migrate_0_8_0(state)
  // }

  // Config is now on the new version
  state.saved.version = config.APP_VERSION
}

function migrate_0_7_0 (state) {
  console.log('migrate to 0.7.0')

  state.saved.torrents.forEach(function (ts) {
    var infoHash = ts.infoHash

    // Migration: replace torrentPath with torrentFileName
    var src, dst
    if (ts.torrentPath) {
      // There are a number of cases to handle here:
      // * Originally we used absolute paths
      // * Then, relative paths for the default torrents, eg '../static/sintel.torrent'
      // * Then, paths computed at runtime for default torrents, eg 'sintel.torrent'
      // * Finally, now we're getting rid of torrentPath altogether
      console.log('migration: replacing torrentPath %s', ts.torrentPath)
      if (path.isAbsolute(ts.torrentPath)) {
        src = ts.torrentPath
      } else if (ts.torrentPath.startsWith('..')) {
        src = ts.torrentPath
      } else {
        src = path.join(config.STATIC_PATH, ts.torrentPath)
      }
      dst = path.join(config.CONFIG_TORRENT_PATH, infoHash + '.torrent')
      // Synchronous FS calls aren't ideal, but probably OK in a migration
      // that only runs once
      if (src !== dst) fs.copySync(src, dst)

      delete ts.torrentPath
      ts.torrentFileName = infoHash + '.torrent'
    }

    // Migration: replace posterURL with posterFileName
    if (ts.posterURL) {
      console.log('migration: replacing posterURL %s', ts.posterURL)
      var extension = path.extname(ts.posterURL)
      src = path.isAbsolute(ts.posterURL)
        ? ts.posterURL
        : path.join(config.STATIC_PATH, ts.posterURL)
      dst = path.join(config.CONFIG_POSTER_PATH, infoHash + extension)
      // Synchronous FS calls aren't ideal, but probably OK in a migration
      // that only runs once
      if (src !== dst) fs.copySync(src, dst)

      delete ts.posterURL
      ts.posterFileName = infoHash + extension
    }

    // Migration: add per-file selections
    if (!ts.selections && ts.files) {
      ts.selections = ts.files.map((x) => true)
    }
  })
}
