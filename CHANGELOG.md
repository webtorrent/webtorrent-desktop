# WebTorrent Desktop Version History

## v0.3.3 - 2016-04-07

### Fixed

- App icon was incorrect (OS X)

## v0.3.2 - 2016-04-07

### Added

- Register WebTorrent as default handler for magnet links (OS X)

### Changed

- Faster startup time (50ms)
- Update Electron to 0.37.5
  - Remove the white flash when loading pages and resizing the window
  - Fix crash when sending IPC messages

### Fixed

- Fix installation bugs with .deb file (Linux)
- Pause audio reliably when closing the window
- Enforce minimimum window size when resizing player (for audio-only .mov files, which are 0x0)

## v0.3.1 - 2016-04-06

### Added

- Add crash reporter to torrent engine process

### Fixed

- Fix cast screen background: cover, don't tile

## v0.3.0 - 2016-04-06

### Added

- **Ubuntu/Debian support!** (.deb installer)
- **DLNA streaming support**
- Add "File > Quit" menu item (Linux)
- App uninstaller (Windows)
- Crash reporting

### Changed

- On startup, do not re-verify files when timestamps are unchanged
- Moved torrent engine to an independent process, for better UI performance
- Removed media queries (UI resizing based on window width)
- Improved Chromecast icon, when connected

### Fixed

- "Download Complete" notification shows consistently
- Create new torrents and seed them without copying to temporary folder
- Clicking the "Download Complete" notification will always activate app
- Fixed harmless "-psn_###" error on first app startup
- Hide play buttons on unplayable torrents
- Better error handling when Chromecast/Airplay cannot connect
- Show player controls immediately on mouse move
- When creating a torrent, show it in UI immediately
- Stop casting to TV when player is closed
- Torrent engine: Fixed memory leaks in `torrent-discovery` and `bittorrent-tracker`
- Torrent engine: Fixed sub-optimal tcp/webrtc connection timeouts
- Torrent engine: Throttle web seed connections to maximum of 4

Thanks to @dcposch, @grunjol, and @feross for contributing to this release.

## v0.2.0 - 2016-03-29

### Added

- Minimise to tray (Windows, Linux)
- Show spinner and download speed when player is stalled waiting for data
- Highlight window on drag-and-drop
- Show notification to update to new app version (Linux)
  - We have an auto-updater for Windows and Mac. We don't have one for Linux yet, so
    Linux users need to download new versions manually.

### Changed

- Renamed WebTorrent.app to WebTorrent Desktop
- Add Cosmos Laundromat as a default torrent

### Fixed

- Only capture media keys when player is active
- Update WebTorrent to 0.88.1 for performance improvements
  - When seeding, do not proactively connect to new peers
  - When seeding, do not accept new peers from peer exchange (ut_pex)
  - Fixed leaks, and other improvements that result in less garbage collection

Thanks to @dcposch, @ungoldman, and @feross for contributing to this release.

## v0.1.1 - 2016-03-28

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
  - Video progress bar shows progress for current file, not full torrent
  - Video player window shows file title instead of torrent title

Thanks to @dcposch, @ungoldman, @rom1504, @grunjol, @Flet, and @feross for contributing to
this release.

## v0.1.0 - 2016-03-25

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

Thanks to @dcposch, @ungoldman, and @feross for contributing to this release.

## v0.0.1 - 2016-03-21

- Wait 10 seconds (instead of 60 seconds) after app launch before checking for updates.

## v0.0.0 - 2016-03-21

The first official release of WebTorrent Desktop, the streaming torrent client for OS X,
Windows, and Linux. For now, we're only releasing binaries for OS X.

WebTorrent Desktop is in ALPHA and under very active development – expect lots more polish in
the coming weeks! If you know JavaScript and want to help us out, there's
[lots to do](https://github.com/feross/webtorrent-desktop/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+contribution%22)!

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
