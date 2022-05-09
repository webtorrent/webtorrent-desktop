import TorrentSummary from './torrent-summary.js'
import TorrentPlayer from './torrent-player.js'
const cache = {
  infoHash: null,
  previousIndex: null,
  currentIndex: null,
  nextIndex: null
}
function hasNext (state) {
  updateCache(state)
  return cache.nextIndex !== null
}
function getNextIndex (state) {
  updateCache(state)
  return cache.nextIndex
}
function hasPrevious (state) {
  updateCache(state)
  return cache.previousIndex !== null
}
function getPreviousIndex (state) {
  updateCache(state)
  return cache.previousIndex
}
function getCurrentLocalURL (state) {
  return state.server
    ? state.server.localURL + '/' + state.playing.fileIndex + '/' +
            encodeURIComponent(state.playing.fileName)
    : ''
}
function updateCache (state) {
  const infoHash = state.playing.infoHash
  const fileIndex = state.playing.fileIndex
  if (infoHash === cache.infoHash) {
    switch (fileIndex) {
      case cache.currentIndex:
        return
      case cache.nextIndex:
        cache.previousIndex = cache.currentIndex
        cache.currentIndex = fileIndex
        cache.nextIndex = findNextIndex(state)
        return
      case cache.previousIndex:
        cache.previousIndex = findPreviousIndex(state)
        cache.nextIndex = cache.currentIndex
        cache.currentIndex = fileIndex
        return
    }
  } else {
    cache.infoHash = infoHash
  }
  cache.previousIndex = findPreviousIndex(state)
  cache.currentIndex = fileIndex
  cache.nextIndex = findNextIndex(state)
}
function findPreviousIndex (state) {
  const files = TorrentSummary.getByKey(state, state.playing.infoHash).files
  for (let i = state.playing.fileIndex - 1; i >= 0; i--) {
    if (TorrentPlayer.isPlayable(files[i])) return i
  }
  return null
}
function findNextIndex (state) {
  const files = TorrentSummary.getByKey(state, state.playing.infoHash).files
  for (let i = state.playing.fileIndex + 1; i < files.length; i++) {
    if (TorrentPlayer.isPlayable(files[i])) return i
  }
  return null
}
export { hasNext }
export { getNextIndex }
export { hasPrevious }
export { getPreviousIndex }
export { getCurrentLocalURL }
export default {
  hasNext,
  getNextIndex,
  hasPrevious,
  getPreviousIndex,
  getCurrentLocalURL
}
