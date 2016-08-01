const electron = require('electron')
const {dispatch} = require('../lib/dispatcher')
const request = require('request');

module.exports = class ChannelController {
  constructor (state) {
    this.state = state
  }

  init (torrentList) {
    this.torrentList = torrentList
    console.log('--- TORRENT LIST:', this.torrentList)

    var torrents = this.getTorrentsFromEnabledChannels()
    console.log('-- GOT TORRENTS from ENABLED CHANNELS:', torrents)
    if (!torrents.length) return
    this.state.saved.torrentsFromEnabledChannels = torrents
  }

  getChannels () {
    return this.state.saved.prefs.channels
  }

  updateChannel (channelIndex, successCallback, errorCallback) {
    var channels = this.state.saved.prefs.channels
    if (!channels[channelIndex]) {
      return []
  	}

    var channel = channels[channelIndex]
    var torrents = []

    request
      .get(channel.url)
      .on('response', onResponse)

    function onResponse (response) {
      response.channel = channel
      if (response.statusCode === 200) return successCallback(response)
      return errorCallback(response)
    }
  }

  getTorrentsFromEnabledChannels () {
    var enabledChannels = this.getEnabledChannels()
    var channels = this.state.saved.prefs.channels
    var torrents = []
    var that = this

    console.log('--- enabledChannels:', enabledChannels)
    console.log('--- channels:', channels)
    enabledChannels.forEach(function (channelIndex) {
      var channel = channels[channelIndex]
      torrents = torrents.concat(channel.torrents)
      console.log(`--- current CHANNEL for index ${channelIndex}:`, channel)
      console.log('--- channel TORRENTS:', channel.torrents)
    })

    return torrents
  }

  getEnabledChannels () {
    return this.state.saved.prefs.enabledChannels || []
  }

  /**
   * Makes GET request to get channel data.
   * 
   * @param  {string} channelUrl
   * @param {function} callback
   */
  getChannel (channelUrl, successCallback, errorCallback) {
    request
      .get(channelUrl)
      .on('response', onResponse)

    function onResponse (response) {
      var body = ''
      response.on('data', function (chunk) {
        body += chunk
      })

      response.on('end', function () {
        var json = JSON.parse(body)
        if (response.statusCode === 200) return successCallback(json, channelUrl)
        return errorCallback(json, channelUrl)
      })
    }
  }

  channelExists (channelUrl) {
    var channels = this.getChannels()
    var exists = channels.some(function (currentChannel) {
      return (channelUrl === currentChannel.url)
    })
    return exists
  }

  addChannel (channelUrl) {
    var that = this
    console.log('--- ADD CHANNEL: URL:', channelUrl)
    if (this.channelExists(channelUrl)) {
      console.log('-- channel already exists:', channelUrl)
      return false
    }
    this.getChannel(channelUrl, onGetChannelOk, onGetChannelError)

    function onGetChannelOk (response) {
      response.url = channelUrl
      console.log('--- onGetChannelOk:', response)
      that.state.unsaved.prefs.channels.push(response)
    }

    function onGetChannelError (response) {
      console.log('--- onGetChannelError:', response)
    }
  }

  // TODO: REMOVE
  // addTorrentsFromChannel (channel) {
  //   console.log('--- ADD TORRENTS FROM CHANNEL:', channel)

  //   var torrents = channel.torrents
  //   if (!torrents || !torrents.length) return

  //   // add torrents
  //   torrents.map((torrent) => this.torrentList.addTorrent(torrent))
  // }

  // TODO: REMOVE
  // removeTorrentsFromChannel (channel) {
  //   console.log('--- REMOVE TORRENTS FROM CHANNEL:', channel)

  //   var torrents = channel.torrents
  //   if (!torrents || !torrents.length) return

  //   // add torrents
  //   torrents.map((torrent) => this.torrentList.addTorrent(torrent))
  // }
}