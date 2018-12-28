const Subtitles = require("./src/renderer/lib/subtitles")

const fs = require('fs')
const file = 'C:/Users/matso/Downloads/Johnny English Strikes Again (2018) [BluRay] [720p] [YTS.AM]/Johnny.English.Strikes.Again.2018.720p.BluRay.x264-[YTS.AM].mp4'
const length = 796811453
const hash = Subtitles.createSubtitleHashFromFile(file, length)


Subtitles.querySubtitles(length, hash, 'fin').then(async (response) => {
  const url = response[0]
  const directory = './tmp/'
  const filename = response[1][0].SubFileName + ".gz"
    
  const result = await Subtitles.downloadGzip(url, directory, response[1][0].SubFileName)
  
  console.log("download ok", result)
})