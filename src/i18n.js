const electron = require('electron')
const fs = require('fs')
const path = require('path')

const config = require('./config')

module.exports = {
  LANGUAGE: getLanguage(),
  LOCALE_MESSAGES: getLocaleMessages()
}

function getLanguage () {
  return process.type === 'renderer'
    ? electron.remote.app.getLocale().split('-')[0] || 'en'
    : electron.app.getLocale().split('-')[0] || 'en'
}

function getLocaleMessages () {
  var langFilePath = path.join(config.LOCALES_PATH, getLanguage() + '.json')

  try {
    fs.accessSync(langFilePath, fs.constants.F_OK | fs.constants.R_OK)
    return JSON.parse(fs.readFileSync(langFilePath, 'utf8'))
  } catch (err) {
    // Use default english messages
    return {}
  }
}
