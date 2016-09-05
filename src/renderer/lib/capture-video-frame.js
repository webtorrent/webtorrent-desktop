module.exports = captureVideoFrame

const {IllegalArgumentError} = require('./errors')

function captureVideoFrame (video, format) {
  if (typeof video === 'string') {
    video = document.querySelector(video)
  }

  if (video == null || video.nodeName !== 'VIDEO') {
    throw new IllegalArgumentError('First argument must be a <video> element or selector')
  }

  if (format == null) {
    format = 'png'
  }

  if (format !== 'png' && format !== 'jpg' && format !== 'webp') {
    throw new IllegalArgumentError('Second argument must be one of "png", "jpg", or "webp"')
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  canvas.getContext('2d').drawImage(video, 0, 0)

  const dataUri = canvas.toDataURL('image/' + format)
  const data = dataUri.split(',')[1]

  return new Buffer(data, 'base64')
}
