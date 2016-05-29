module.exports = {
  init
}

var electron = require('electron')

var config = require('../config')
var log = require('./log')

var ANNOUNCEMENT_URL = config.ANNOUNCEMENT_URL +
  '?version=' + config.APP_VERSION +
  '&platform=' + process.platform

/**
 * In certain situations, the WebTorrent team may need to show an announcement to
 * all WebTorrent Desktop users. For example: a security notice, or an update
 * notification (if the auto-updater stops working).
 *
 * When there is an announcement, the `ANNOUNCEMENT_URL` endpoint should return an
 * HTTP 200 status code with a JSON object like this:
 *
 *   {
 *     "title": "WebTorrent Desktop Announcement",
 *     "message": "Security Issue in v0.xx",
 *     "detail": "Please update to v0.xx as soon as possible..."
 *   }
 */
function init () {
  var get = require('simple-get')
  get.concat(ANNOUNCEMENT_URL, onResponse)
}

function onResponse (err, res, data) {
  if (err) return log(`Failed to retrieve announcement: ${err.message}`)
  if (res.statusCode !== 200) return log('No announcement exists')

  try {
    data = JSON.parse(data.toString())
  } catch (err) {
    // Support plaintext announcement messages, using a default title.
    data = {
      title: 'WebTorrent Desktop Announcement',
      message: data.toString(),
      detail: data.toString()
    }
  }

  electron.dialog.showMessageBox({
    type: 'info',
    buttons: ['OK'],
    title: data.title,
    message: data.message,
    detail: data.detail
  }, noop)
}

function noop () {}
