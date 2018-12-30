const fs = require('fs')
const languagesRaw = fs.readFileSync('./ext/data/opensubtitles_languages')
const languages = languagesRaw.toString().split('\n').map(line => {
  const parts = line.split('\t')
  return {
    id: parts[0],
    label: parts[2]
  }
})

console.log(languages)
