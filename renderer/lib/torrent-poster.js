module.exports = torrentPoster

var captureVideoFrame = require('./capture-video-frame')
var path = require('path')

function torrentPoster (torrent, cb) {
  // First, try to use the largest video file
  // Filter out file formats that the <video> tag definitely can't play
  var videoFile = getLargestFileByExtension(torrent, ['.mp4', '.m4v', '.webm', '.mov', '.mkv'])
  if (videoFile) return torrentPosterFromVideo(videoFile, torrent, cb)

  // Second, try to use the largest image file
  var imgFile = getLargestFileByExtension(torrent, ['.gif', '.jpg', '.png'])
  if (imgFile) return torrentPosterFromImage(imgFile, torrent, cb)

  // TODO: generate a waveform from the largest sound file
  // Finally, admit defeat
  return cb(new Error('Cannot generate a poster from any files in the torrent'))
}

function getLargestFileByExtension (torrent, extensions) {
  var files = torrent.files.filter(function (file) {
    var extname = path.extname(file.name).toLowerCase()
    return extensions.indexOf(extname) !== -1
  })
  if (files.length === 0) return undefined
  return files.reduce(function (a, b) {
    return a.length > b.length ? a : b
  })
}

function torrentPosterFromVideo (file, torrent, cb) {
  var index = torrent.files.indexOf(file)

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

      if (buf.length === 0) return cb(new Error('Generated poster contains no data'))

      cb(null, buf, '.jpg')
    }
  }
}

function torrentPosterFromImage (file, torrent, cb) {
  var extname = path.extname(file.name)
  file.getBuffer((err, buf) => cb(err, buf, extname))
}
