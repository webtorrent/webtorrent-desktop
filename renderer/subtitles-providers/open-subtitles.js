module.exports = {
  downloadSubtitles
}

var config = require('../../config')
var opensubtitles = require('subtitler')
var download = require('download')
var zlib = require('zlib');

function downloadSubtitles (params) {
  console.log('--- OPEN SUBTITLES: downloadSubtitles:', params)

  var total = 0

  getSubtitles(params)
  	.then(onGetSubtitlesOk, onGetSubtitlesError)

	function onGetSubtitlesOk (subtitlesCollection) {
		console.log('[ OPEN-SUBTITLES ]--> onGetSubtitlesOk:', subtitlesCollection)

		subtitlesCollection.forEach(function (subtitle) {
			var url = subtitle.SubDownloadLink,
				targetPath = `${params.path}/subs`

			var downloadParams = {
				url,
				targetPath,
				subtitle
			}
			downloadSubtitlesFile(downloadParams)
				.then(onDownloadSubtitlesFileOk, onDownloadSubtitlesFileError)
		})

		function onDownloadSubtitlesFileOk (response) {
			console.log('[ OPEN-SUBTITLES ]--> onDownloadSubtitlesFileOk:', response)

			// a new subtitles file downloaded ok
			// increment counter
			++total

			// extract subtitles and pass output to main callback
			var sourceFile = `${response.targetPath}/${response.subtitle.IDSubtitleFile}.gz`,
				targetFile = `${params.path}/subs/${params.name}-${params.lang}-${total}.${response.subtitle.SubFormat}`
			extractSubtitlesFile(sourceFile, targetFile)
				.on('finish', onExtractSubtitlesFileOk)
				.on('error', onExtractSubtitlesFileError)

			function onExtractSubtitlesFileOk () {
				console.log('-- onExtractSubtitlesFileOk:', targetFile)

				var subtitleDownloadedParams = {
					file: targetFile,
					subtitle: response.subtitle
				}
				params.onSubtitlesDownloaded(subtitleDownloadedParams)
			}

			function onExtractSubtitlesFileError (error) {
				console.log('-- onExtractSubtitlesFileError:', error)
			}
		}

		function onDownloadSubtitlesFileError (response) {
			console.log('[ OPEN-SUBTITLES ]--> onDownloadSubtitlesFileError:', response)
		}
	}

	function onGetSubtitlesError (response) {
		console.log('[ OPEN-SUBTITLES ]--> onGetSubtitlesError:', response)
	}
}

function downloadSubtitlesFile (params) {
	console.log('--- DOWNLOAD FILE: URL:', params.url)
	console.log('--- DOWNLOAD FILE: PATH:', params.targetPath)

	return download(params.url, params.targetPath)
		.then(onDownloadOk, onDownloadError)

	function onDownloadOk () {
		console.log('--- onDownloadOk:')
		return params
	}

	function onDownloadError (error) {
		console.log('--- onDownloadError:', error)
	}
}

function extractSubtitlesFile (sourceFile, targetFile) {
	console.log('--- extractSubtitlesFile: sourceFile:', sourceFile)
	console.log('--- extractSubtitlesFile: targetFile:', targetFile)

	var reader = fs.createReadStream(sourceFile),
		writer = fs.createWriteStream(targetFile)

	return reader
		.pipe(zlib.createGunzip())
		.pipe(writer)
}

/**
 * Returns collection of available subtitles.
 * 
 * @param  {object} params
 * @return {object} promise
 */
function getSubtitles (params) {
	return opensubtitles.api.login()
		.then(onLoginOk, onLoginError)

	function onLoginOk (token) {
		console.log('--- token:', token)

		// search subtitles
		return opensubtitles.api.search(token, params.lang, {
			query: params.name
		})
	}

	function onLoginError (error) {
		// TODO
		console.log('--- findSubtitles: onLoginError:', error)
	}
}






