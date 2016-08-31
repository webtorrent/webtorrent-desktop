module.exports = {
  init
}

const config = require('./config')
const electron = require('electron')

function init () {
  electron.crashReporter.start({
    companyName: config.APP_NAME,
    productName: config.APP_NAME,
    submitURL: config.CRASH_REPORT_URL
  })
}
