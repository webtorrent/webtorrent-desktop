module.exports = {
  init
}

function init () {
  const config = require('./config')
  const electron = require('electron')

  electron.crashReporter.start({
    companyName: config.APP_NAME,
    productName: config.APP_NAME,
    submitURL: config.CRASH_REPORT_URL
  })
}
