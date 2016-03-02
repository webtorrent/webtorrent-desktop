module.exports = captureVideoFrame

function captureVideoFrame (video, format) {
  if (typeof video === 'string') video = document.querySelector(video)
  if (!video || video.nodeName !== 'VIDEO') {
    throw new Error('First argument must be a <video> element or selector')
  }
  if (format == null) format = 'png'
  if (format !== 'png' && format !== 'jpg' && format !== 'webp') {
    throw new Error('Second argument must be one of "png", "jpg", or "webp"')
  }

  var canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  canvas.getContext('2d').drawImage(video, 0, 0)

  var dataUri = canvas.toDataURL('image/' + format)
  var data = dataUri.split(',')[1]

  return new Buffer(data, 'base64')
}
