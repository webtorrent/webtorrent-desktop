var createTorrent = require('create-torrent')
var thunky = require('thunky')
var WebTorrent = require('webtorrent')
var xhr = require('xhr')

module.exports = thunky(getClient)

global.WEBTORRENT_ANNOUNCE = createTorrent.announceList
  .map(function (arr) {
    return arr[0]
  })
  .filter(function (url) {
    return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
  })

function getClient (cb) {
  getRtcConfig('https://instant.io/rtcConfig', function (err, rtcConfig) {
    if (err) console.error(err)
    var client = new WebTorrent({ rtcConfig: rtcConfig })
    cb(null, client)
  })
}

function getRtcConfig (url, cb) {
  xhr(url, function (err, res) {
    if (err || res.statusCode !== 200) {
      cb(new Error('Could not get WebRTC config from server. Using default (without TURN).'))
    } else {
      var rtcConfig
      try { rtcConfig = JSON.parse(res.body) } catch (err) {}
      if (rtcConfig) {
        console.log('got rtc config: %o', rtcConfig)
        cb(null, rtcConfig)
      } else {
        cb(new Error('Got invalid WebRTC config from server: ' + res.body))
      }
    }
  })
}
