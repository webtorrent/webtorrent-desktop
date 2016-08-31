const State = require('../lib/state')

// Controls the UI checking for new versions of the app, prompting install
module.exports = class UpdateController {
  constructor (state) {
    this.state = state
  }

  // Shows a modal saying that we have an update
  updateAvailable (version) {
    const skipped = this.state.saved.skippedVersions
    if (skipped && skipped.includes(version)) {
      console.log('new version skipped by user: v' + version)
      return
    }
    this.state.modal = { id: 'update-available-modal', version: version }
  }

  // Don't show the modal again until the next version
  skipVersion (version) {
    let skipped = this.state.saved.skippedVersions
    if (!skipped) skipped = this.state.saved.skippedVersions = []
    skipped.push(version)
    State.saveThrottled(this.state)
  }
}
