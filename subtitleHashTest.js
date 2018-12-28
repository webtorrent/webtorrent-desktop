const SubtitleHash = require("./build/renderer/lib/subtitle-hash")

const file = 'C:/Users/matso/Downloads/Johnny English Strikes Again (2018) [BluRay] [720p] [YTS.AM]/Johnny.English.Strikes.Again.2018.720p.BluRay.x264-[YTS.AM].mp4'
const length = 796811453
console.log(SubtitleHash.createSubtitleHashFromFile(file, length))