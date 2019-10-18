
module.exports = {
  getStreamInfo
}

function getStreamInfo (src) {
  if (/\.(mp4|m4v|mov)$/.test(src)) {
    return getMp4StreamInfo(src)
  } else if (/\.(mkv|webm)$/.test(src)) {
    return getWebmStreamInfo(src)
  } else {
    return getDefaultStreamInfo(src)
  }
}

function getMp4StreamInfo (src) {
  const BUFFER_SIZE = 16384
  const streamInfo = { video: 0, audio: 0 }
  const offset = { start: 0, end: 0, pointer: 0, done: Infinity }

  return new Promise(function (resolve, reject) {
    consume()

    function consume () {
      window
        .fetch(src, {
          headers: {
            range: `bytes=${offset.pointer}-${offset.pointer + BUFFER_SIZE}`
          }
        })
        .then(response => response.arrayBuffer())
        .then(chunk => {
          offset.start = offset.pointer
          offset.end = offset.pointer + BUFFER_SIZE

          parseAtom(offset, chunk)
        })
    }

    function parseAtom (offset, chunk) {
      // exit when we finish parsing moov atom
      if (offset.pointer >= offset.done) {
        return resolve(streamInfo)
      }

      // check if we need next chunk
      if ((offset.pointer + 8) > offset.end) {
        return consume()
      }

      const size = new DataView(chunk, (offset.pointer - offset.start) + 0, 4).getUint32(0)
      const name = String.fromCharCode.apply(
        null,
        new Uint8Array(chunk, (offset.pointer - offset.start) + 4, 4)
      )

      if (!/^[a-z]{4}$/.test(name)) {
        return
      }

      if (name === 'moov') {
        offset.done = offset.pointer + size

        // move to child atom
        offset.pointer += 8
        parseAtom(offset, chunk)
      } else if (name === 'mdia') {
        // move to child atom
        offset.pointer += 8
        parseAtom(offset, chunk)
      } else if (name === 'trak') {
        const tmp = offset.pointer

        // move to child atom
        offset.pointer = tmp + 8
        parseAtom(offset, chunk)

        // move to sibling atom
        offset.pointer = tmp + size
        parseAtom(offset, chunk)
      } else if (name === 'hdlr') {
        const componentSubtype = String.fromCharCode.apply(
          null,
          new Uint8Array(chunk, (offset.pointer - offset.start) + 16, 4)
        )

        if (componentSubtype === 'vide') {
          streamInfo.video++
        } else if (componentSubtype === 'soun') {
          streamInfo.audio++
        }
      } else {
        // move to sibling atom
        offset.pointer += size
        parseAtom(offset, chunk)
      }
    }
  })
}

function getWebmStreamInfo (src) {
  const BUFFER_SIZE = 16384
  const streamInfo = { video: 0, audio: 0 }
  const offset = { start: 0, end: 0, pointer: 0, done: Infinity }

  return new Promise(function (resolve, reject) {
    consume()

    function consume () {
      window
        .fetch(src, {
          headers: {
            range: `bytes=${offset.pointer}-${offset.pointer + BUFFER_SIZE}`
          }
        })
        .then(response => response.arrayBuffer())
        .then(chunk => {
          offset.start = offset.pointer
          offset.end = offset.pointer + BUFFER_SIZE

          parseElement(offset, chunk)
        })
    }

    function readVint (chunk, pointer) {
      const buffer = new Uint8Array(chunk)

      const length = 8 - Math.floor(Math.log2(buffer[pointer]))
      const mask = (1 << (8 - length)) - 1

      let value = buffer[pointer] & mask
      for (let i = 1; i < length; i += 1) {
        value = (value << 8) + buffer[pointer + i]
      }

      return { length, value }
    }

    function readElementId (chunk, pointer, length) {
      const buffer = new Uint8Array(chunk, pointer, length)

      return buffer.reduce((acc, cur) => (acc << 8) + cur)
    }

    function parseElement (offset, chunk) {
      // exit when we finish parsing Track element
      if (offset.pointer >= offset.done) {
        return resolve(streamInfo)
      }

      // check if we need next chunk
      if (offset.pointer > offset.end) {
        return consume()
      }

      // elementId
      const elementIdVint = readVint(chunk, offset.pointer)
      const elementId = readElementId(chunk, offset.pointer, elementIdVint.length)

      // elementSize
      const elementSizeVint = readVint(chunk, offset.pointer + elementIdVint.length)
      const elementSize = elementSizeVint.value

      if (elementId === 0x1A45DFA3) { // EBML
        // move to sibling element
        offset.pointer += (elementIdVint.length + elementSizeVint.length + elementSize)
        parseElement(offset, chunk)
      } else if (elementId === 0x18538067) { // Segment
        // move to child element
        offset.pointer += (elementIdVint.length + elementSizeVint.length)
        parseElement(offset, chunk)
      } else if (elementId === 0x1549A966) { // Segment Information
        // move to sibling element
        offset.pointer += (elementIdVint.length + elementSizeVint.length + elementSize)
        parseElement(offset, chunk)
      } else if (elementId === 0x1654AE6B) { // Track
        offset.done = offset.pointer + (elementIdVint.length + elementSizeVint.length + elementSize)

        // move to child element
        offset.pointer += (elementIdVint.length + elementSizeVint.length)
        parseElement(offset, chunk)
      } else if (elementId === 0xAE) { // TrackEntry
        const tmp = offset.pointer

        // move to child element
        offset.pointer = tmp + (elementIdVint.length + elementSizeVint.length)
        parseElement(offset, chunk)

        // move to sibling element
        offset.pointer = tmp + (elementIdVint.length + elementSizeVint.length + elementSize)
        parseElement(offset, chunk)
      } else if (elementId === 0x83) { // TrackType
        const TrackType = new Uint8Array(
          chunk,
          offset.pointer + elementIdVint.length + elementSizeVint.length,
          elementSize
        )[0]

        if (TrackType === 1) {
          streamInfo.video++
        } else if (TrackType === 2) {
          streamInfo.audio++
        }
      } else {
        // move to sibling element
        offset.pointer += (elementIdVint.length + elementSizeVint.length + elementSize)
        parseElement(offset, chunk)
      }
    }
  })
}

function getDefaultStreamInfo (src) {
  const streamInfo = { video: 1, audio: 1 }

  return new Promise(function (resolve, reject) {
    return resolve(streamInfo)
  })
}
