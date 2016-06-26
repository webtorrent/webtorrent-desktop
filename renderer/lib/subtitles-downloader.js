module.exports = {
  downloadSubtitles
}

var config = require('../../config')

/**
 * Downloads specified amount of available subtitles
 * for specified language.
 * Calls "onSubtitlesDownloaded" after each subtitles file
 * is downloaded and ready to be added.
 * Returns a promise that resolves once all subtitles are downloaded.
 *
 * @param {object} torrentSummary
 * @param {function} onSubtitlesDownloaded
 * @return {object} promise
 */
function downloadSubtitles (torrentSummary, onSubtitlesDownloaded) {
  // Load currently enabled subtitles provider
  var subtitlesProvider = getEnabledSubtitlesProvider()

  console.log('--- DOWNLOAD SUBS FOR:', torrentSummary)
  console.log('--- ENABLED SUBTITLE PROVIDER:', subtitlesProvider)

  var findSubtitlesParams = {
    name: torrentSummary.name,
    path: torrentSummary.path, // first assume a single file torrent
    lang: config.DEFAULT_SUBTITLES_LANGUAGE,
    onSubtitlesDownloaded: onSubtitlesDownloaded
  }

  // add torrent folder if it's being used
  // this is the case for multifile torrents
  if (torrentSummary.files.length > 1) {
    findSubtitlesParams.path += '/' + torrentSummary.name
  }

  return subtitlesProvider.downloadSubtitles(findSubtitlesParams)
}

function getEnabledSubtitlesProvider () {
  var enabledSubtitlesProviderId = null
  console.log('---- config.SUBTITLES_PROVIDERS:', config.SUBTITLES_PROVIDERS)
  for (var subtitlesProviderId in config.SUBTITLES_PROVIDERS) {
    var currentSubtitlesProvider = config.SUBTITLES_PROVIDERS[subtitlesProviderId]
    if (currentSubtitlesProvider.enabled) {
      enabledSubtitlesProviderId = subtitlesProviderId
    }
  }

  // dynamically load enabled subtitles provider and return it
  var enabledSubtitlesProvider = require('../subtitles-providers/' + enabledSubtitlesProviderId)
  return enabledSubtitlesProvider
}
