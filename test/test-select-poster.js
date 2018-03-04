const test = require('tape')

const fs = require('fs')
const path = require('path')

const WebTorrent = require('webtorrent')
const torrentPoster = require('../build/renderer/lib/torrent-poster')

const client = new WebTorrent()

test("get cover from: 'wiredCd.torrent'", (t) => {
  const torrentPath = path.join(__dirname, '..', 'static', 'wiredCd.torrent')
  const torrentData = fs.readFileSync(torrentPath)

  client.add(torrentData, (torrent) => {
    torrentPoster(torrent, (err, buf, extension) => {
      if (err) {
        t.fail(err)
      } else {
        t.equals(extension, '.jpg')
        t.end()
      }
    })
  })
})
