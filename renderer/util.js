var path = require('path')

var config = require('../config')

exports.getAbsoluteStaticPath = function (filePath) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(config.STATIC_PATH, filePath)
}
