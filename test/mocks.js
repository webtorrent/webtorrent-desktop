const electron = require('electron')
const config = require('./config')

console.log('Mocking electron.dialog.showOpenDialogSync...')
electron.dialog.showOpenDialogSync = showOpenDialogSync

console.log('Mocking electron.remote.dialog.showOpenDialogSync...')
electron.remote.dialog.showOpenDialogSync = showOpenDialogSync

function showOpenDialogSync (win, opts) {
  return /select.*torrent file/i.test(opts.title)
    ? config.TORRENT_FILES
    : config.SEED_FILES
}

console.log('Mocking electron.dialog.showSaveDialogSync...')
electron.dialog.showSaveDialogSync = showSaveDialogSync

console.log('Mocking electron.remote.dialog.showSaveDialogSync...')
electron.remote.dialog.showSaveDialogSync = showSaveDialogSync

function showSaveDialogSync (win, opts) {
  return config.SAVED_TORRENT_FILE
}
