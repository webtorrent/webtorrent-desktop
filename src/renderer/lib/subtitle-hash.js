module.exports = {
  createSubtitleHash,
  createSubtitleHashFromFile,
  createHash
}

const fs = require('fs')
const BigIntBuffer = require('bigint-buffer')

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