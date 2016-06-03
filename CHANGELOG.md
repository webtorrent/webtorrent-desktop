# WebTorrent Desktop Version History

## v0.7.1 - 2016-06-02

### Changed

- Change "Step Forward" keyboard shortcut to `Alt+Left`
- Change "Step Backward" keyboard shortcut to to `Alt+Right`

### Fixed

- First time startup bug -- invalid torrent/poster paths

## v0.7.0 - 2016-06-02

### Added

- Improved AirPlay support -- using the new [`airplayer`](https://www.npmjs.com/package/airplayer) package
- Remember volume setting in player, for as long as the app is open

### Changed

- Add (+) button now also accepts non .torrent files and creates a torrent from
  those files
- Show prompt text in title bar for open dialogs (OS X)
- Upgrade Electron to 1.2.1
  - Improve window resizing when aspect ratio is enforced (OS X)
  - Use .ico format for better icon rendering quality (Windows)
  - Fix crash reporter not working (Windows)

### Fixed

- Re-enable WebRTC (web peers)! (OS X, Windows)
  - Windows support was disabled in v0.6.1 to work around a bug in Electron
  - OS X support was disabled in v0.4.0 to work around a 100% CPU bug
- Fix subtitle selector radio button UI size glitch
- Fix race condition causing exeption on app startup
- Fix duplicate torrent detection in some cases
- Fix "gray screen" exception caused by incorrect file list order
- Fix torrent loading message UI misalignment

### Known issues

- When upgrading to WebTorrent Desktop v0.7.0, some torrent metadata (file list,
  selected files, whether torrent is streamable) will be cleared. Just start the
  torrent to re-populate the metadata.

## v0.6.1 - 2016-05-26

### Fixed

- Disable WebRTC to work around Electron crash (Windows)
  - Will be re-enabled in the next version of WebTorrent, which will be based on
    the next version of Electron, where the bug is fixed.
- Fix crash when updating from WebTorrent 0.5.x in some situtations (#583)
- Fix crash when dropping files onto the dock icon (OS X)
- Fix keyboard shortcuts Space and ESC being captured globally (#585)
- Fix crash, show error when drag-dropping hidden files (#586)

## v0.6.0 - 2016-05-24

### Added

- Added Preferences page to set Download folder
- Save video position, resume playback from saved position
- Add additional video player keyboard shortcuts (#275)
- Use `poster.jpg` file as the poster image if available (#558)
- Associate .torrent files to WebTorrent Desktop (OS X) (#553)
- Add support for pasting `instant.io` links (#559)
- Add announcement feature

### Changed

- Nicer player UI
- Reduce startup jank, improve startup time (#568)
- Cleanup unsupported codec detection (#569, #570)
- Cleaner look for the torrent file list
- Improve subtitle positioning (#551)

### Fixed

- Fix Uncaught TypeError: Cannot read property 'update' of undefined (#567)
- Fix bugs in LocationHistory
  - When player is active, and magnet link is pasted, go back to list
  - After deleting torrent, remove just the player from forward stack
  - After creating torrent, remove create torrent page from forward stack
  - Cancel button on create torrent page should only go back one page

## v0.5.1 - 2016-05-18

### Fixed

- Fix auto-updater (OS X, Windows).

## v0.5.0 - 2016-05-17

### Added

- Select/deselect individual files to torrent.
- Automatically include subtitle files (.srt, .vtt) from torrent in the subtitles menu.
- "Add Subtitle File..." menu item.

### Changed

- When manually adding subtitle track(s), always switch to the new track.

### Fixed

- Magnet links throw exception on app launch. (OS X)
- Multi-file torrents would not seed in-place, were copied to Downloads folder.
- Missing 'About WebTorrent' menu item. (Windows)
- Rare exception. ("Cannot create BrowserWindow before app is ready")

## v0.4.0 - 2016-05-13

### Added

- Better Windows support!
  - Windows 32-bit build.
  - Windows Portable App build.
  - Windows app signing, for fewer install warnings.
- Better Linux support!
  - Linux 32-bit build.
- Subtitles support!
  - .srt and .vtt file support.
  - Drag-and-drop files on video, or choose from file selector.
  - Multiple subtitle files support.
- Stream to VLC when the audio codec is unplayable (e.g. AC3, EAC3).
- "Show in Folder" item in context menu.
- Volume slider, with mute/unmute button.
- New "Create torrent" page to modify:
  - Torrent comment.
  - Trackers.
  - Private torrent flag.
- Use mouse wheel to increase/decrease volume.
- Bounce the Downloads stack when download completes. (OS X)
- New default torrent on first launch: The WIRED CD.

### Changed

- Improve app startup time by 40%.
- UI tweaks: Reduce font size, reduce torrent list item height.
- Add Playback menu for playback-related functionality.
- Fix installing when the app is already installed. (Windows)
- Don't kill unrelated processes on uninstall. (Windows)
- Set "sheet offset" correctly for create torrent dialog. (OS X)
- Remove OS X-style Window menu. (Linux, Windows)
- Remove "Add Fake Airplay/Chromecast" menu items.

### Fixed

- Disable WebRTC to fix 100% CPU usage/crashes caused by Chromium issue. This is
  temporary. (OS X)
- When fullscreen, make controls use the full window. (OS X)
- Support creating torrents that contain .torrent files.
- Block power save while casting to a remote device.
- Do not block power save when the space key is pressed from the torrent list.
- Support playing .mpg and .ogv extensions in the app.
- Fix video centering for multi-screen setups.
- Show an error when adding a duplicate torrent.
- Show an error when adding an invalid magnet link.
- Do not stop music when tabbing to another program (OS X)
- Properly size the Windows volume mixer icon.
- Default to the user's OS-defined, localized "Downloads" folder.
- Enforce minimimum window size when resizing player to prevent window disappearing.
- Fix rare race condition error on app quit.
- Don't use zero-byte torrent "poster" images.

Thanks to @grunjol, @rguedes, @furstenheim, @karloluis, @DiegoRBaquero, @alxhotel,
@AgentEpsilon, @remijouannet, Rolando Guedes, @dcposch, and @feross for contributing
to this release!

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
