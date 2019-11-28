const electron = require('electron')
const config = require('./config')

console.log('Mocking electron.dialog.showOpenDialogSync...')
electron.dialog.showOpenDialogSync = showOpenDialogSync

function showOpenDialogSync (win, opts) {
  return /select.*torrent file/i.test(opts.title)
    ? config.TORRENT_FILES
    : config.SEED_FILES
}

console.log('Mocking electron.dialog.showSaveDialogSync...')
electron.dialog.showSaveDialogSync = showSaveDialogSync

function showSaveDialogSync (win, opts) {
  return config.SAVED_TORRENT_FILE
}
