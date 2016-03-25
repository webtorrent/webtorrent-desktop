# WebTorrent.app Version History

## v0.1.0

- **Windows support!**
  - See `WebTorrentSetup.exe` in the downloads below!
  - Auto-updater included, just like the OS X version.
  - Automatically installs desktop/start menu shortcuts
  - Windows top menu is no longer automatically hidden.
- **Audio file support!**
  - Supports playback of .mp3, .aac, .ogg, .wav
  - Audio file metadata gets shown in the UI
- Focus the WebTorrent window after opening magnet link in third-party app
- Subtler app sounds
- Fix for some magnet links failing to open

Thanks to @dcposch, @ngoldman, and @feross for contributing to this release.

## v0.0.1

- Wait 10 seconds (instead of 60 seconds) after app launch before checking for updates.

## v0.0.0

The first official release of WebTorrent.app, the streaming torrent client for OS X,
Windows, and Linux. For now, we're only releasing binaries for OS X.

WebTorrent.app is in ALPHA and under very active development – expect lots more polish in
the coming weeks! If you know JavaScript and want to help us out, there's
[lots to do](https://github.com/feross/webtorrent-app/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+contribution%22)!

### Features

- **Lightweight, fast torrent client**
- **Beautiful user experience**
- **Instantly stream video and audio** from torrents!
  - WebTorrent fetches file pieces from the network **on-demand**, for instant playback.
  - Even when the file is not fully downloaded, **seeking still works!** (Seeking just reprioritizes what pieces are fetched from the network.)
- Stream videos to **AirPlay** and **Chromecast**
- **Pure Javascript**, so it's very easy to contribute code!
- Based on the most popular and comprehensive torrent package in Node.js, [`webtorrent`](https://www.npmjs.com/package/webtorrent).
- Lots of **features**, without the bloat:
  - Opens magnet links and .torrent files
  - Drag-and-drop makes adding torrents easy!
  - Seed files/folders by dragging them onto the app
  - Discovers peers via tracker servers, DHT (Distributed Hash Table), and peer exchange
  - Make the video window "float on top" for watching video while you work!
  - Supports WebTorrent protocol – for connecting to WebRTC peers (i.e. web browsers)
