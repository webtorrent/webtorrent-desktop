const fs = require('fs')
const path = require('path')
const OS = require('opensubtitles-api')
const http = require('http')

const util = require('util')

const {dispatch} = require('../lib/dispatcher')

module.exports =
  class SubtitlesProviderController {

    constructor (state) {
      this.state = state
    }

    fetchSubtitles () {
      let downloadPath = this.state.saved.prefs.downloadPath
      let filePath = path.join(downloadPath, this.state.getPlayingFileSummary().path)
      let fileName = this.state.getPlayingFileSummary().name
      // TODO: get user main language
      let manager = new SubtitlesProvidersManager('en', filePath)
      let providers = manager.avaibleProvidersNames
      let files = []

      // For each provider, show what subs he has
      providers.forEach(provider => {
        manager.fetchSubsFromProvider(provider, subs => {
          // TODO: show modal to allow user to choose the sub file from the provider he wants
          subs.forEach(sub => {
            // For now, we download the 3 most popular subs for each provider on the current dir
            let subPath = path.join(
              path.dirname(filePath),
              util.format('auto_downloaded_os_%s_%s_%s.srt',
              fileName, sub.score, sub.downloads)
            )

            // Each time a sub is download, we added to the files list
            manager.downloadSubtitle(sub, subPath, file => {
              files.push(file)
              dispatch('addSubtitles', files, true)
            })
          })
        }, (provider) => {
          // TODO: let user enter other query options such as an imdbid
          dispatch('error', util.format('No subtitles found in %s', provider.name))
        })
      })
    }
}

class SubtitlesProvidersManager {

  constructor (lang, currentMediaFileName) {
    this.lang = lang
    this.fileName = currentMediaFileName
    // Contains each providers which extends BaseSubtitleProvider
    this.providers = [new OpenSubtitlesProvider(this.lang, this.fileName)]
  }

  get avaibleProvidersNames () {
    return this.providers.map(provider => provider.name)
  }

  fetchSubsFromProvider (name, onSubsFetched, onNoSubsFounded) {
    let provider = this.providers.find(elem => elem.name === name)
    provider.onSubsFetched = onSubsFetched
    provider.onNoSubsFounded = onNoSubsFounded
    provider.fetchSubs()
  }

  downloadSubtitle (subtitle, outFileName, doneListener) {
    let file = fs.createWriteStream(outFileName)
    http.get(subtitle['url'], function (response) {
      response.pipe(file)
      if (doneListener) {
        doneListener(file)
      }
    })
  }
}

// Base class for each sub provider liek OpenSubtitles
class BaseSubtitleProvider {
  constructor (name) {
    this.name = name
    if (this.fetchSubs === undefined) {
      throw new TypeError('Must implement fetchSubs')
    }
    if (this.setCustomQuery === undefined) {
      throw new TypeError('Must implement setCustomQuery')
    }
  }
  fetchSubs () {}
  setCustomQuery (query) {}
}

class OpenSubtitlesProvider extends BaseSubtitleProvider {
  constructor (lang, filePath) {
    super('OpenSubtitles')
    this.lang = lang
    this.initOS()

    this.options = {
      sublanguageid: lang,
      path: filePath,
      filename: filePath.split('/').pop(),
      limit: 3
    }
  }

  initOS () {
    this.OpenSubtitles = new OS({
      useragent: 'OSTestUserAgentTemp',
      ssl: true
    })
  }

  // If the default settings don't find anything, we tried other settings
  // such as the imdbid which will be enter manually by the user
  setCustomQuery (query) {
    Object.assign(this.options, query)
  }

  fetchSubs () {
    this.OpenSubtitles.search(this.options).then(subtitles => {
      if (subtitles[this.lang]) {
        if (this.onSubsFetched) {
          this.onSubsFetched(subtitles[this.lang].filter(elem => {
            // Return only what matters
            return {
              'url': elem.url,
              'score': elem.score,
              'downloads': elem.downloads
            }
          }))
        }
      } else {
        if (this.onNoSubsFounded) {
          this.onNoSubsFounded(this)
        }
      }
    })
  }
}
