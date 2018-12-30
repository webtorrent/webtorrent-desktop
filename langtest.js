const fs = require('fs')
const concat = require('simple-concat')
const LanguageDetect = require('languagedetect')
const srtToVtt = require('srt-to-vtt')

const filePath = 'C:/Users/matso/Downloads/Johnny English Strikes Again (2018) [BluRay] [720p] [YTS.AM].fin.srt'
console.log('loadSubtitle filepath', filePath)
const vttStream = fs.createReadStream(filePath).pipe(srtToVtt())

concat(vttStream, function (err, buf) {
  if (err) return dispatch('error', 'Can\'t parse subtitles file.')

  const vttStream = fs.createReadStream(filePath).pipe(srtToVtt())
  const vttContents = buf.toString().replace(/(.*-->.*|\d*)/g, '')
  const langDetector = new LanguageDetect()
  let langDetected = langDetector.detect(vttContents, 2)

  console.log(vttContents)
  console.log(langDetected)
})
