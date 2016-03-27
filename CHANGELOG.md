# WebTorrent.app Version History

## Unreleased

- Performance improvements
  - Improve app startup time by over 100%
  - Reduce the number of DOM updates substantially
  - Update UI immediately anytime state is changed, instead on 1 second interval
- Added right-click menu
  - Save .torrent File
  - Copy Instant.io Link to Clipboard
  - Copy Magnet Link to Clipbaord
- Added keyboard shortcut for volume up (⌘/Ctrl + ↑) and volume down (⌘/Ctrl + ↓)
- Add desktop launcher shortcuts, like OS X has, for KDE and GNOME (Linux)
- Add "About" window (Windows, Linux)
- Better default window size that fits all the default torrents
- Fixed
  - Crash when ".local/share/{applications,icons}" path did not exist (Linux)
  - WebTorrent executable can be moved without breaking torrents in the client

## v0.1.0

- **Windows support!**
  - Includes auto-updater, just like the OS X version.
  - Installs desktop and start menu shortcuts.
- **Audio file support!**
  - Supports playback of .mp3, .aac, .ogg, .wav
  - Audio file metadata gets shown in the UI
- Top menu is no longer automatically hidden (Windows)
- When magnet links are opened from third-party apps, the WebTorrent window now gets focus.
- Subtler app sounds.
- Fix for an issue that caused some magnet links to fail to open.

**NOTE:** OS X users must install v0.1.0 manually because the app bundle ID was changed in this release, and the auto-updater cannot handle this condition.

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
