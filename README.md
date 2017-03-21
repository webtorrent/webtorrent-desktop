<h1 align="center">
  <br>
  <a href="https://webtorrent.io">
    <img src="https://webtorrent.io/img/WebTorrent.png" alt="WebTorrent" width="200">
  </a>
  <br>
  WebTorrent Desktop
  <br>
  <br>
</h1>

<h4 align="center">The streaming torrent app. For Mac, Windows, and Linux.</h4>

<p align="center">
  <a href="https://gitter.im/feross/webtorrent"><img src="https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg" alt="gitter"></a>
  <a href="https://github.com/feross/webtorrent-desktop/releases"><img src="https://img.shields.io/github/release/feross/webtorrent-desktop.svg" alt="github release"></a>
  <a href="https://travis-ci.org/feross/webtorrent"><img src="https://img.shields.io/travis/feross/webtorrent/master.svg" alt="travis"></a>
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="Standard - JavaScript Style Guide"></a>
</p>

## Install

Download the latest version of WebTorrent Desktop from
[the official website](https://webtorrent.io/desktop/) or the
[GitHub releases](https://github.com/feross/webtorrent-desktop/releases) page.

**WebTorrent Desktop** is under very active development. You can try out the
current (unstable) development version by cloning the Git repo. See the
instructions below in the ["How to Contribute"](#how-to-contribute) section.

## Screenshots

<p align="center">
  <img src="https://webtorrent.io/img/screenshot-player3.png" alt="screenshot" align="center">
  <img src="https://webtorrent.io/img/screenshot-main.png" width="612" height="749" alt="screenshot" align="center">
</p>

## How to Contribute

### Get the code

```
$ git clone https://github.com/feross/webtorrent-desktop.git
$ cd webtorrent-desktop
$ npm install
```

### Run the app

```
$ npm start
```

### Watch the code

Restart the app automatically every time code changes. Useful during development.

```
$ npm run watch
```

### Run linters

```
$ npm test
```

### Run integration tests

```
$ npm run test-integration
```

The integration tests use Spectron and Tape. They click through the app, taking screenshots and
comparing each one to a reference. Why screenshots?

* Ad-hoc checking makes the tests a lot more work to write
* Even diffing the whole HTML is not as thorough as screenshot diffing. For example, it wouldn't
  catch an bug where hitting ESC from a video doesn't correctly restore window size.
* Chrome's own integration tests use screenshot diffing iirc
* Small UI changes will break a few tests, but the fix is as easy as deleting the offending
  screenshots and running the tests, which will recreate them with the new look.
* The resulting Github PR will then show, pixel by pixel, the exact UI changes that were made! See
  https://github.com/blog/817-behold-image-view-modes

For MacOS, you'll need a Retina screen for the integration tests to pass. Your screen should have
the same resolution as a 2016 12" Macbook.

For Windows, you'll need Windows 10 with a 1366x768 screen.

When running integration tests, keep the mouse on the edge of the screen and don't touch the mouse
or keyboard while the tests are running.

### Package the app

Builds app binaries for Mac, Linux, and Windows.

```
$ npm run package
```

To build for one platform:

```
$ npm run package -- [platform] [options]
```

Where `[platform]` is `darwin`, `linux`, `win32`, or `all` (default).

The following optional arguments are available:

- `--sign` - Sign the application (Mac, Windows)
- `--package=[type]` - Package single output type.
   - `deb` - Debian package
   - `zip` - Linux zip file
   - `dmg` - Mac disk image
   - `exe` - Windows installer
   - `portable` - Windows portable app
   - `all` - All platforms (default)

Note: Even with the `--package` option, the auto-update files (.nupkg for Windows,
-darwin.zip for Mac) will always be produced.

#### Windows build notes

The Windows app can be packaged from **any** platform.

Note: Windows code signing only works from **Windows**, for now.

Note: To package the Windows app from non-Windows platforms,
[Wine](https://www.winehq.org/) needs to be installed. For example on Mac, first
install [XQuartz](http://www.xquartz.org/), then run:

```
brew install wine
```

(Requires the [Homebrew](http://brew.sh/) package manager.)

#### Mac build notes

The Mac app can only be packaged from **macOS**.

#### Linux build notes

The Linux app can be packaged from **any** platform.

### Privacy

WebTorrent Desktop collects some basic usage stats to help us make the app better.
For example, we track how well the play button works. How often does it succeed?
Time out? Show a missing codec error?

The app never sends any personally identifying information, nor does it track which
torrents you add.

### Code Style

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## License

MIT. Copyright (c) [WebTorrent, LLC](https://webtorrent.io).
