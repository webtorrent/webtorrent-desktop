import applicationConfig from 'application-config'
import path from 'path'
import arch from 'arch'
import fs from 'fs'
import electron from '../electron.cjs'

const appConfig = applicationConfig('WebTorrent')
const APP_NAME = 'WebTorrent'
const APP_TEAM = 'WebTorrent, LLC'
const APP_VERSION = JSON.parse(fs.readFileSync('package.json').toString()).version
const IS_TEST = isTest()
const PORTABLE_PATH = IS_TEST
  ? path.join(process.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp', 'WebTorrentTest')
  : path.join(path.dirname(process.execPath), 'Portable Settings')
const IS_PRODUCTION = isProduction()
const IS_PORTABLE = isPortable()

const UI_HEADER_HEIGHT = 38
const UI_TORRENT_HEIGHT = 100

function getConfigPath () {
  if (IS_PORTABLE) {
    return PORTABLE_PATH
  } else {
    return path.dirname(appConfig.filePath)
  }
}

function getDefaultDownloadPath () {
  if (IS_PORTABLE) {
    return path.join(getConfigPath(), 'Downloads')
  } else {
    return getPath('downloads')
  }
}

function getPath (key) {
  if (!process.versions.electron || process.type !== 'browser') {
    // Node.js process
    return ''
  }
  // Electron main process
  return electron.app.getPath(key)
}

function isTest () {
  return process.env.NODE_ENV === 'test'
}

function isPortable () {
  if (IS_TEST) {
    return true
  }

  if (process.platform !== 'win32' || !IS_PRODUCTION) {
    // Fast path: Non-Windows platforms should not check for path on disk
    return false
  }

  try {
    // This line throws if the "Portable Settings" folder does not exist, and does
    // nothing otherwise.
    fs.accessSync(PORTABLE_PATH, fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch (err) {
    return false
  }
}

function isProduction () {
  if (!process.versions.electron) {
    // Node.js process
    return false
  }
  if (process.platform === 'darwin') {
    return !/\/Electron\.app\//.test(process.execPath)
  }
  if (process.platform === 'win32') {
    return !/\\electron\.exe$/.test(process.execPath)
  }
  if (process.platform === 'linux') {
    return !/\/electron$/.test(process.execPath)
  }
}

export const ANNOUNCEMENT_URL = 'https://webtorrent.io/desktop/announcement'
export const AUTO_UPDATE_URL = 'https://webtorrent.io/desktop/update'
export const CRASH_REPORT_URL = 'https://webtorrent.io/desktop/crash-report'
export const TELEMETRY_URL = 'https://webtorrent.io/desktop/telemetry'
export const APP_COPYRIGHT = `Copyright © 2014-${new Date().getFullYear()} ${APP_TEAM}`
export const APP_FILE_ICON = new URL('../static/WebTorrentFile', import.meta.url).pathname // path.join(__dirname, '..',
// 'static', 'WebTorrentFile')
export const APP_ICON = new URL('../static/WebTorrent', import.meta.url).pathname // path.join(__dirname, '..',
// 'static',
// 'WebTorrent')
export const CONFIG_PATH = getConfigPath()
export const DEFAULT_TORRENTS = [
  {
    testID: 'bbb',
    name: 'Big Buck Bunny',
    posterFileName: 'bigBuckBunny.jpg',
    torrentFileName: 'bigBuckBunny.torrent'
  },
  {
    testID: 'cosmos',
    name: 'Cosmos Laundromat (Preview)',
    posterFileName: 'cosmosLaundromat.jpg',
    torrentFileName: 'cosmosLaundromat.torrent'
  },
  {
    testID: 'sintel',
    name: 'Sintel',
    posterFileName: 'sintel.jpg',
    torrentFileName: 'sintel.torrent'
  },
  {
    testID: 'tears',
    name: 'Tears of Steel',
    posterFileName: 'tearsOfSteel.jpg',
    torrentFileName: 'tearsOfSteel.torrent'
  },
  {
    testID: 'wired',
    name: 'The WIRED CD - Rip. Sample. Mash. Share',
    posterFileName: 'wiredCd.jpg',
    torrentFileName: 'wiredCd.torrent'
  }
]
export const DELAYED_INIT = 3000 /* 3 seconds */
export const DEFAULT_DOWNLOAD_PATH = getDefaultDownloadPath()
export const GITHUB_URL = 'https://github.com/webtorrent/webtorrent-desktop'
export const GITHUB_URL_ISSUES = 'https://github.com/webtorrent/webtorrent-desktop/issues'
export const GITHUB_URL_RAW = 'https://raw.githubusercontent.com/webtorrent/webtorrent-desktop/master'
export const GITHUB_URL_RELEASES = 'https://github.com/webtorrent/webtorrent-desktop/releases'
export const HOME_PAGE_URL = 'https://webtorrent.io'
export const TWITTER_PAGE_URL = 'https://twitter.com/WebTorrentApp'
export const OS_SYSARCH = arch() === 'x64' ? 'x64' : 'ia32'
export const POSTER_PATH = path.join(getConfigPath(), 'Posters')
export const ROOT_PATH = new URL('../', import.meta.url).pathname
export const STATIC_PATH = new URL('../static', import.meta.url).pathname
export const TORRENT_PATH = path.join(getConfigPath(), 'Torrents')
export const WINDOW_ABOUT = 'file://' + new URL('../static/about.html', import.meta.url).pathname
export const WINDOW_MAIN = 'file://' + new URL('../static/main.html', import.meta.url).pathname
export const WINDOW_WEBTORRENT = 'file://' + new URL('../static/webtorrent.html', import.meta.url).pathname
export const WINDOW_INITIAL_BOUNDS = {
  width: 500,
  height: UI_HEADER_HEIGHT + (UI_TORRENT_HEIGHT * 6) // header + 6 torrents
}
export const WINDOW_MIN_HEIGHT = UI_HEADER_HEIGHT + (UI_TORRENT_HEIGHT * 2)
export const WINDOW_MIN_WIDTH = 425
export { APP_NAME }
export { APP_TEAM }
export { APP_VERSION }
export { APP_NAME as APP_WINDOW_TITLE }
export { IS_PORTABLE }
export { IS_PRODUCTION }
export { IS_TEST }
export { UI_HEADER_HEIGHT }
export { UI_TORRENT_HEIGHT }
export default {
  ANNOUNCEMENT_URL,
  AUTO_UPDATE_URL,
  CRASH_REPORT_URL,
  TELEMETRY_URL,
  APP_COPYRIGHT,
  APP_FILE_ICON,
  APP_ICON,
  APP_NAME,
  APP_TEAM,
  APP_VERSION,
  APP_WINDOW_TITLE: APP_NAME,
  CONFIG_PATH,
  DEFAULT_TORRENTS,
  DELAYED_INIT,
  DEFAULT_DOWNLOAD_PATH,
  GITHUB_URL,
  GITHUB_URL_ISSUES,
  GITHUB_URL_RAW,
  GITHUB_URL_RELEASES,
  HOME_PAGE_URL,
  TWITTER_PAGE_URL,
  IS_PORTABLE,
  IS_PRODUCTION,
  IS_TEST,
  OS_SYSARCH,
  POSTER_PATH,
  ROOT_PATH,
  STATIC_PATH,
  TORRENT_PATH,
  WINDOW_ABOUT,
  WINDOW_MAIN,
  WINDOW_WEBTORRENT,
  WINDOW_INITIAL_BOUNDS,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  UI_HEADER_HEIGHT,
  UI_TORRENT_HEIGHT
}
