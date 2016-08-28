const electron = require('electron')
const fs = require('fs')
const IntlMessageFormat = require('intl-messageformat')
const path = require('path')
const prettyBytes = require('prettier-bytes')

const config = require('./config')

const LANGUAGE = getLanguage()
const LOCALE_MESSAGES = getLocaleMessages()

module.exports = {
  LANGUAGE: LANGUAGE,
  LOCALE_MESSAGES: LOCALE_MESSAGES,
  prettyBytes: i18nPrettyBytes
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

var bytesMsg = new IntlMessageFormat('{num} {unit}', LANGUAGE)
function i18nPrettyBytes (num) {
  const [number, unit] = prettyBytes(num).split(' ')
  return bytesMsg.format({
    num: number,
    unit: new IntlMessageFormat(LOCALE_MESSAGES['unit-' + unit] || unit, LANGUAGE)
      .format(unit)
  })
}
