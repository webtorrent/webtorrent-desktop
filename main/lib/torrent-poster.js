module.exports = torrentPoster

var captureVideoFrame = require('./capture-video-frame')

function torrentPoster (torrent, cb) {
  // use largest file
  var index = torrent.files.indexOf(torrent.files.reduce(function (a, b) {
    return a.length > b.length ? a : b
  }))

  var server = torrent.createServer(0)
  server.listen(0, onListening)

  function onListening () {
    var port = server.address().port
    var url = 'http://localhost:' + port + '/' + index
    var video = document.createElement('video')
    video.addEventListener('canplay', onCanPlay)

    video.volume = 0
    video.src = url
    video.play()

    function onCanPlay () {
      video.removeEventListener('canplay', onCanPlay)
      video.addEventListener('seeked', onSeeked)

      video.currentTime = Math.min((video.duration || 600) * 0.03, 60)
    }

    function onSeeked () {
      video.removeEventListener('seeked', onSeeked)

      var buf = captureVideoFrame(video)

      // unload video element
      video.pause()
      video.src = ''
      video.load()

      server.destroy()

      cb(null, buf)
    }
  }
}
