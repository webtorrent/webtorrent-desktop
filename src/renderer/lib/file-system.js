const fs = require('fs/promises')

async function fileExists (path, mode) {
  try {
    await fs.access(path, mode)

    return true
  } catch {
    return false
  }
}

module.exports = {
  fileExists,
  mkdir: fs.mkdir,
  readFile: fs.readFile,
  readdir: fs.readdir,
  stat: fs.stat,
  unlink: fs.unlink,
  writeFile: fs.writeFile
}
