module.exports = {
  createSubtitleHash,
  createSubtitleHashFromFile,
  createHash,
  querySubtitles,
  downloadGzip,
  downloadSubtitle
}

const fs = require('fs')
const BigIntBuffer = require('bigint-buffer')
const streamToBuffer = require('stream-with-known-length-to-buffer')
const request = require('request-promise-native')
const download = require('download-file')
const {ungzip} = require('node-gzip')

function createSubtitleHash (totalLength, first64kbytes, last64kbytes) {
  const head = createHash(first64kbytes)
  const tail = createHash(last64kbytes)
  
  console.log('bytesize', totalLength)
  console.log('head', head)
  console.log('tail', tail)
  
  // For some reason there are 3 additional chars at the beginning of the string, so we take those off
  // Also we make sure that the string is always at least 16 chars by adding zero padding
  return ("0".repeat(16) + (BigInt(totalLength) + head + tail).toString(16).substr(-16)).substr(-16)
}

function createSubtitleHashFromFile (filename, length) {
  const buffer = fs.readFileSync(filename)
  const chunkSize = 64 * 1024 // 64 kB
  
  const first64kbytes = buffer.slice(0, chunkSize)
  const last64kbytes = buffer.slice(buffer.length - chunkSize)
  
  return createSubtitleHash(length || buffer.length, first64kbytes, last64kbytes)
}

function createHash (bytes) {
  let hash = BigInt(0)
  
  bytes.forEach((b, i) => {
    const part = bytes.slice(8 * i, 8 * i + 8)
    hash += BigIntBuffer.toBigIntLE(part)
  })
  
  return hash
}

function streamChunk (file, start, end, chunkSize) {
  return new Promise((resolve, reject) => {
    streamToBuffer(file.createReadStream({
      start: start,
      end: end
    }), chunkSize, (error, buffer) => {
      if (error) {
        reject(err.message)
        return
      }
      
      resolve(buffer)
    })
  })
}

async function downloadSubtitle (movieFile, path) {
  const chunkSize = 64 * 1024
  const first64kbytes = await streamChunk(movieFile, 0, chunkSize, chunkSize)
  const last64kbytes = await streamChunk(movieFile, movieFile.length - chunkSize, movieFile.length, chunkSize)
  const filepath = path + '/' + movieFile.path
  const length = movieFile.length
  const hash = createSubtitleHash(length, first64kbytes, last64kbytes)
  const response = await querySubtitles(movieFile.length, hash, 'fin')
  const url = response[0]
  const directory = path + '/'
  
  return await downloadGzip(url, directory, response[1][0].SubFileName)
}

async function downloadGzip(url, directory, finalFilename){
  const contents = await request({
    url: url, 
    encoding: null
    //headers: {
    //  'User-Agent': 'Butter'
    //}
  })
  
  const filepath = directory + finalFilename
  const extractedContents = await ungzip(contents)
  
  fs.writeFileSync(filepath, extractedContents)

  return filepath
}

function querySubtitles (totalLength, subtitleHash, languageId){
  return new Promise((resolve, reject) => {
    //const url = 'https://rest.opensubtitles.org/search/query-'+encodeURIComponent(filename.toLowerCase())+'/sublanguageid-fin'
    const url = 'https://rest.opensubtitles.org/search/moviebytesize-' + parseInt(totalLength, 10) + 
      '/moviehash-' + encodeURIComponent(subtitleHash) + '/sublanguageid-' + encodeURIComponent(languageId)
    
    request({
      url: url, 
      headers: {
        'User-Agent': 'Butter'
      }
    }).then(response => {
      const responseObject = JSON.parse(response)
      resolve([responseObject.length > 0 ? responseObject[0].SubDownloadLink : null, responseObject, url])
    })
  })
}