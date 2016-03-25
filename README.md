<h1 align="center">
  <br>
  <a href="https://webtorrent.io"><img src="https://webtorrent.io/img/WebTorrent.png" alt="WebTorrent" width="200"></a>
  <br>
  WebTorrent.app
  <br>
  <br>
</h1>

<h4 align="center">The streaming torrent client. For OS X, Windows, and Linux.</h4>

<p align="center">
    <a href="https://gitter.im/feross/webtorrent">
        <img src="https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg"
             alt="Gitter">
    </a>
    <a href="https://travis-ci.org/feross/webtorrent-app">
        <img src="https://img.shields.io/travis/feross/webtorrent-app/master.svg"
             alt="Travis Build">
    </a>
    <a href="https://github.com/feross/webtorrent-app/releases">
        <img src="https://img.shields.io/github/release/feross/webtorrent-app.svg"
             alt="Latest Release Version">
    </a>
</p>

## Install

**WebTorrent.app** is still under very active development. You can download the latest version from the [releases](https://github.com/feross/webtorrent-app/releases) page.

## Screenshot

<p align="center">
  <img src="./static/screenshot.png" width="562" height="630" alt="screenshot" align="center">
</p>

## How to Contribute

### Install dependencies

```
$ npm install
```

### Run app

```
$ npm start
```

### Package app

Builds app binaries for OS X, Linux, and Windows.

```
$ npm run package
```

To build for one platform:

```
$ npm run package -- [platform]
```

Where `[platform]` is `darwin`, `linux`, or `win32`.

#### Windows build notes

To package the Windows app from non-Windows platforms, [Wine](https://www.winehq.org/) needs
to be installed.

On OS X, first install [XQuartz](http://www.xquartz.org/), then run:

```
brew install wine
```

(Requires the [Homebrew](http://brew.sh/) package manager.)

### Code Style

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## License

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).

