module.exports = {
  init
}

var config = require('./config')
var electron = require('electron')

function init () {
  electron.crashReporter.start({
    companyName: config.APP_NAME,
    productName: config.APP_NAME,
    submitURL: config.CRASH_REPORT_URL
  })
}
