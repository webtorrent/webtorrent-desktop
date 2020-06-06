module.exports = {
  init
}

function init () {
  const config = require('./config')
  const { crashReporter } = require('electron')

  crashReporter.start({
    companyName: config.APP_NAME,
    productName: config.APP_NAME,
    submitURL: config.CRASH_REPORT_URL
  })
}
