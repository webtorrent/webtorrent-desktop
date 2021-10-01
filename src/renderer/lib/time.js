module.exports = {
  calculateEta
}

function calculateEta(missing, downloadSpeed) {
  if (downloadSpeed === 0 || missing === 0) return

  const rawEta = missing / downloadSpeed
  const hours = Math.floor(rawEta / 3600) % 24
  const minutes = Math.floor(rawEta / 60) % 60
  const seconds = Math.floor(rawEta % 60)

  // Only display hours and minutes if they are greater than 0 but always
  // display minutes if hours is being displayed
  const hoursStr = hours ? hours + ' h' : ''
  const minutesStr = (hours || minutes) ? minutes + ' min' : ''
  const secondsStr = seconds + ' s'

  return `${hoursStr} ${minutesStr} ${secondsStr} remaining`
}
