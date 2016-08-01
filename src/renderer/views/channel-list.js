const React = require('react')
const {dispatch} = require('../lib/dispatcher')

module.exports = class ChannelList extends React.Component {

  render () {
    this.state = this.props.state
    this.state.currentChannel = null // reset torrents list

    var channels = this.state.saved.prefs.channels
    var channelRows = []
    for (var channelUrl in channels) {
      var channel = channels[channelUrl]
      channelRows.push(this.renderChannel(channel))
    }

    // render no channels row
    if (!channelRows.length) {
      channelRows.push(this.getNoChannelsRow())
    }
    // var channelRows = this.state.saved.prefs.channels.map(
    //   (channel, i) => this.renderChannel(channel, i)
    // )

    return (
      <div key='torrent-list' className='torrent-list'>
        {channelRows}
      </div>
    )
  }

  getNoChannelsRow () {
    // TODO: Background image
    var style = {}
    // if (channel.posterUrl) {
    //   var gradient = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%)'
    //   style.backgroundImage = gradient + `, url('${channel.posterUrl}')`
    // }

    return (
      <div
        key='no-channels'
        style={style}
        className='torrent'
        onClick={() => this.showPreferences()}>

        <div key='channel-metadata' className='channel metadata'>
          <div key='channel-name' className='name ellipsis'>No Channels</div>
          <div key='channel-description' className='ellipsis'>
            Click here to go to Preferences and add channels.
          </div>
        </div>
      </div>
    )
  }

  renderChannel (channel) {
    // Background image
    var style = {}
    if (channel.posterUrl) {
      var gradient = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%)'
      style.backgroundImage = gradient + `, url('${channel.posterUrl}')`
    }

    return (
      <div
        key={channel.url}
        style={style}
        className='torrent'
        onClick={() => this.openChannel(channel)}>
        {this.renderChannelMetadata(channel)}
      </div>
    )
  }

  openChannel (channel) {
    console.log('--- OPEN CHANNEL', channel)
    this.state.currentChannel = channel

    // add all torrents from channel
    channel.loadedTorrents = channel.loadedTorrents || {}
    channel.torrents.map(function (torrent) {
      // avoid adding existing torrents
      if (channel.loadedTorrents[torrent]) return

      // add new torrent
      dispatch('addTorrent', torrent, channel)
    })

    // show torrents
    this.showTorrentList(channel)
  }

  showPreferences () {
    dispatch('preferences')
  }

  showTorrentList (channel) {
    this.state.location.go({
      url: 'home',
      setup: function (cb) {
        // initialize preferences
        var title = channel && channel.name || 'Torrents List'
        dispatch('setTitle', title)
        cb()
      }
    })
  }

  renderChannelMetadata (channel) {
    return (
      <div key='channel-metadata' className='channel metadata'>
        <div key='channel-name' className='name ellipsis'>{channel.name}</div>
        <div key='channel-description' className='ellipsis' title={channel.description}>
          {channel.description}
        </div>
      </div>
    )
  }
}
