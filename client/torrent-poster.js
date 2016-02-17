module.exports = torrentScreenshot

var captureVideoFrame = require('./capture-video-frame')

function torrentScreenshot (torrent, cb) {
  if (torrent.ready) onReady()
  else torrent.once('ready', onReady)

  function onReady () {
    // use largest file
    var file = torrent.files.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    var video = document.createElement('video')
    file.renderTo(video)

    video.currentTime = 5
    video.addEventListener('seeked', onSeeked)

    function onSeeked (e) {
      video.removeEventListener('seeked', onSeeked)
      var buf = captureVideoFrame(video)
      cb(null, buf)
    }
  }
}
