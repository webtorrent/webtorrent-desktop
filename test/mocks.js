const path = require('path')
const electron = require('electron')

const MOCK_OPEN_TORRENTS = [path.join(__dirname, 'resources', '1.torrent')]

console.log('Mocking electron native integrations...')
electron.dialog.showOpenDialog = function (win, opts, cb) {
  cb(MOCK_OPEN_TORRENTS)
}
