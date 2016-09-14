const electron = require('electron')
const config = require('./config')

console.log('Mocking electron.dialog.showOpenDialog...')
electron.dialog.showOpenDialog = function (win, opts, cb) {
  const ret = /select.*torrent file/i.test(opts.title)
    ? config.TORRENT_FILES
    : config.SEED_FILES
  cb(ret)
}

console.log('Mocking electron.remote.dialog.showSaveDialog...')
electron.dialog.showSaveDialog = function (win, opts, cb) {
  cb(config.SAVED_TORRENT_FILE)
}
