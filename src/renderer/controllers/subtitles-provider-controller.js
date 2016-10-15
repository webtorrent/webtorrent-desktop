const electron = require('electron')
const fs = require('fs')
const path = require('path')
const parallel = require('run-parallel')

const remote = electron.remote

const OS = require('opensubtitles-api')
const http = require('http')

const {dispatch} = require('../lib/dispatcher')

module.exports = class SubtitlesProviderController {
  
  constructor (state) {
    this.state = state
  }

  fetchSubtitlesFor(fileName){

    let manager = new SubtitlesProvidersManager('en',fileName)

    let providers = manager.avaibleProvidersNames

    //For each provider, show what subs he has
    providers.forEach(provider => {
      manager.fetchSubsFromProvider(provider,subs => {
        console.log(subs)
        subs.forEach(sub => {
          //manager.downloadSubtitle(sub,sub.score + "_" + sub.downloads +".srt")
        })
      })
    })
  }
}

class SubtitlesProvidersManager {

  constructor(lang,currentMediaFileName){

    this.lang = lang

    this.fileName = currentMediaFileName

    //Contains each providers which extends BaseSubtitleProvider
    this.providers = [new OpenSubtitlesProvider(this.lang,this.fileName)]

  }

  get avaibleProvidersNames(){
    return this.providers.map(provider => provider.name)
  }

  fetchSubsFromProvider(name,listener){
    let provider = this.providers.find(elem => elem.name === name)

    provider.onSubsFetched = listener

    provider.onNoSubsFounded = () => {
      console.log("No subs founded :(, try another query options");
    }
    provider.fetchSubs()
  }

  downloadSubtitle(subtitle,outFileName){
    let file = fs.createWriteStream(outFileName)
    http.get(subtitle['url'], function(response) {
      response.pipe(file);
    })
  }

}


class BaseSubtitleProvider {
  constructor(name){
    this.name = name
    if (this.fetchSubs === undefined) {
     throw new TypeError("Must implement fetchSubs");
    }
    if (this.setCustomQuery === undefined) {
     throw new TypeError("Must implement setCustomQuery");
    }
  }
  fetchSubs(){}
  setCustomQuery(query){}
}

class OpenSubtitlesProvider extends BaseSubtitleProvider {
  constructor(lang,filePath){
    super("OpenSubtitles")
    this.lang = lang
    this.initOS()

    this.options = {
      sublanguageid : lang,
      path: filePath,
      filename: filePath.split("/").pop(),
      limit : 3
    }
  }

  initOS (){
    this.OpenSubtitles = new OS({
        useragent:'OSTestUserAgentTemp',
        ssl: true
    })
  }

  setCustomQuery(query){
    Object.assign(this.options,query)
  }

  fetchSubs(){
    this.OpenSubtitles.search(this.options).then(subtitles => {
      if(subtitles[this.lang]){
        if(this.onSubsFetched){
          this.onSubsFetched(subtitles[this.lang].filter(elem => {
            //Return only what matters
            return {
              'url' : elem.url,
              'score' : elem.score,
              'downloads': elem.downloads
            }
          }))
        }
      }else{
        if(this.onNoSubsFounded){
          this.onNoSubsFounded()
        }
      }
    })
  }
}


function sample(file){

  let manager = new SubtitlesProvidersManager("en",file)

  let providers = manager.avaibleProvidersNames

  console.log(providers)

  providers.forEach(provider => {
    manager.fetchSubsFromProvider(provider,subs => {
      console.log(subs)
      subs.forEach(sub => {
        manager.downloadSubtitle(sub,sub.score + "_" + sub.downloads +".srt")
      })
    })
  })
}
