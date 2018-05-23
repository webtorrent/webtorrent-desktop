module.exports = torrentPoster

const captureFrame = require('capture-frame')
const path = require('path')

const mediaExtensions = {
  audio: ['.aac', '.asf', '.flac', '.m2a', '.m4a', '.mp2', '.mp4', '.mp3', '.oga', '.ogg', '.opus',
    '.wma', '.wav', '.wv', '.wvp'],
  video: ['.mp4', '.m4v', '.webm', '.mov', '.mkv'],
  image: ['.gif', '.jpg', '.jpeg', '.png']
}

function torrentPoster (torrent, cb) {
  // First, try to use a poster image if available
  const posterFile = torrent.files.filter(function (file) {
    return /^poster\.(jpg|png|gif)$/.test(file.name)
  })[0]
  if (posterFile) return extractPoster(posterFile, cb)

  // 'score' each media type based on total size present in torrent
  const bestScore = ['audio', 'video', 'image'].map(mediaType => {
    return {
      type: mediaType,
      size: calculateDataLengthByExtension(torrent, mediaExtensions[mediaType])}
  }).sort((a, b) => { // sort descending on size
    return b.size - a.size
  })[0]

  if (bestScore.size === 0) {
    // Admit defeat, no video, audio or image had a significant presence
    return cb(new Error('Cannot generate a poster from any files in the torrent'))
  }

  // Based on which media type is dominant we select the corresponding poster function
  switch (bestScore.type) {
    case 'audio':
      return torrentPosterFromAudio(torrent, cb)
    case 'image':
      return torrentPosterFromImage(torrent, cb)
    case 'video':
      return torrentPosterFromVideo(torrent, cb)
  }
}

/**
 * Calculate the total data size of file matching one of the provided extensions
 * @param torrent
 * @param extensions List of extension to match
 * @returns {number} total size, of matches found (>= 0)
 */
function calculateDataLengthByExtension (torrent, extensions) {
  const files = filterOnExtension(torrent, extensions)
  if (files.length === 0) return 0
  return files
    .map(file => file.length)
    .reduce((a, b) => {
      return a + b
    })
}

/**
 * Get the largest file of a given torrent, filtered by provided extension
 * @param torrent Torrent to search in
 * @param extensions Extension whitelist filter
 * @returns Torrent file object
 */
function getLargestFileByExtension (torrent, extensions) {
  const files = filterOnExtension(torrent, extensions)
  if (files.length === 0) return undefined
  return files.reduce((a, b) => {
    return a.length > b.length ? a : b
  })
}

/**
 * Filter file on a list extension, can be used to find al image files
 * @param torrent Torrent to filter files from
 * @param extensions File extensions to filter on
 * @returns {number} Array of torrent file objects matching one of the given extensions
 */
function filterOnExtension (torrent, extensions) {
  return torrent.files.filter(file => {
    const extname = path.extname(file.name).toLowerCase()
    return extensions.indexOf(extname) !== -1
  })
}

/**
 * Returns a score how likely the file is suitable as a poster
 * @param imgFile File object of an image
 * @returns {number} Score, higher score is a better match
 */
function scoreAudioCoverFile (imgFile) {
  const fileName = path.basename(imgFile.name, path.extname(imgFile.name)).toLowerCase()
  const relevanceScore = {
    cover: 80,
    folder: 80,
    album: 80,
    front: 80,
    back: 20,
    spectrogram: -80
  }

  for (let keyword in relevanceScore) {
    if (fileName === keyword) {
      return relevanceScore[keyword]
    }
    if (fileName.indexOf(keyword) !== -1) {
      return relevanceScore[keyword]
    }
  }
  return 0
}

function torrentPosterFromAudio (torrent, cb) {
  const imageFiles = filterOnExtension(torrent, mediaExtensions.image)

  const bestCover = imageFiles.map(file => {
    return {
      file: file,
      score: scoreAudioCoverFile(file)
    }
  }).reduce((a, b) => {
    if (a.score > b.score) {
      return a
    }
    if (b.score > a.score) {
      return b
    }
    // If score is equal, pick the largest file, aiming for highest resolution
    if (a.file.length > b.file.length) {
      return a
    }
    return b
  })

  if (!bestCover) return cb(new Error('Generated poster contains no data'))

  const extname = path.extname(bestCover.file.name)
  bestCover.file.getBuffer((err, buf) => cb(err, buf, extname))
}

function torrentPosterFromVideo (torrent, cb) {
  const file = getLargestFileByExtension(torrent, mediaExtensions.video)

  const index = torrent.files.indexOf(file)

  const server = torrent.createServer(0)
  server.listen(0, onListening)

  function onListening () {
    const port = server.address().port
    const url = 'http://localhost:' + port + '/' + index
    const video = document.createElement('video')
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

      const buf = captureFrame(video)

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

function torrentPosterFromImage (torrent, cb) {
  const file = getLargestFileByExtension(torrent, mediaExtensions.image)
  extractPoster(file, cb)
}

function extractPoster (file, cb) {
  const extname = path.extname(file.name)
  file.getBuffer((err, buf) => { return cb(err, buf, extname) })
}
