<h1 align="center">
  <br>
  <a href="https://webtorrent.io"><img src="https://webtorrent.io/img/WebTorrent.png" alt="WebTorrent" width="200"></a>
  <br>
  WebTorrent Desktop
  <br>
  <br>
</h1>

<h4 align="center">The streaming torrent app. For Mac, Windows, and Linux.</h4>

<p align="center">
  <a href="https://gitter.im/feross/webtorrent"><img src="https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg" alt="Gitter"></a>
  <a href="https://travis-ci.org/feross/webtorrent-desktop"><img src="https://img.shields.io/travis/feross/webtorrent-desktop/master.svg" alt="Travis"></a>
  <a href="https://github.com/feross/webtorrent-desktop/releases"><img src="https://img.shields.io/github/release/feross/webtorrent-desktop.svg" alt="Release"></a>
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
*-darwin.zip for Mac) will always be produced.

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
