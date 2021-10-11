import electron from '../electron.cjs'

async function init () {
  const config = await import('./config.js')
  electron.crashReporter.start({
    productName: config.APP_NAME,
    submitURL: config.CRASH_REPORT_URL,
    globalExtra: { _companyName: config.APP_NAME },
    compress: true
  })
}

export default { init }
