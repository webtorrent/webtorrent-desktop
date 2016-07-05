/* eslint-env mocha */

process.env.NODE_ENV = 'test'

var assert = require('assert')
var LocationHistory = require('../renderer/lib/location-history')

describe('LocationHistory', () => {
  let location
  const FIRST_URL = 'first-page'
  const SECOND_URL = 'second-page'

  beforeEach(() => { location = new LocationHistory() })

  describe('#go()', () => {
    it('should load given page', (done) => {
      location.go({ url: FIRST_URL }, () => {
        // After the first page has been loaded
        assert.equal(location.url(), FIRST_URL)
        location.go({ url: SECOND_URL }, () => {
          // After the second page has been loaded
          assert.equal(location.url(), SECOND_URL)
          done()
        })
      })
    })

    it('should wait for onbeforeload before loading new page', (done) => {
      let callback

      location.go({ url: FIRST_URL }, () => {
        // After the first page has been loaded
        location.go({ url: SECOND_URL, onbeforeload: waitForCallback }, () => {
          // After the second page has been loaded
          assert.equal(location.url(), SECOND_URL)
          done()
        })
        // After the first, but before the second page has been loaded
        assert.notEqual(location.url(), SECOND_URL)
        callback()
      })

      function waitForCallback (cb) { callback = cb }
    })

    it('should call onafterunload after unloading the current page', (done) => {
      let functionCalled = false

      location.go({ url: FIRST_URL, onafterunload: firstUnloaded }, () => {
        location.go({ url: SECOND_URL }, () => {
          assert.ok(functionCalled)
          done()
        })
      })

      function firstUnloaded () {
        functionCalled = true
        assert.notEqual(location.url(), FIRST_URL)
      }
    })
  })

  describe('#back()', () => {
    it('should load the previous page', (done) => {
      location.go({ url: FIRST_URL }, () => {
        location.go({ url: SECOND_URL }, () => {
          location.back(() => {
            assert.equal(location.url(), FIRST_URL)
            done()
          })
        })
      })
    })

    it('should wait for onbeforeload before loading the previous page', (done) => {
      let callback

      location.go({ url: FIRST_URL, onbeforeload: waitForCallback }, () => {
        location.go({ url: SECOND_URL }, () => {
          // After both pages have been loaded
          location.back(() => {
            assert.equal(location.url(), FIRST_URL)
            done()
          })
          // Wait for callback from onbeforeload before loading the prev. page
          assert.notEqual(location.url(), FIRST_URL)
          callback()
        })
      })
      // Load the first page for the first time
      callback()

      function waitForCallback (cb) { callback = cb }
    })

    it('should call onafterunload after unloading the current page', (done) => {
      let functionCalled = false

      location.go({ url: FIRST_URL }, () => {
        location.go({ url: SECOND_URL, onafterunload: secondUnloaded }, () => {
          location.back(() => {
            assert.ok(functionCalled)
            done()
          })
        })
      })

      function secondUnloaded () {
        functionCalled = true
        assert.notEqual(location.url(), SECOND_URL)
      }
    })
  })

  describe('#forward()', () => {
    it('should load the next page', (done) => {
      location.go({ url: FIRST_URL }, () => {
        location.go({ url: SECOND_URL }, () => {
          location.back(() => {
            location.forward(() => {
              assert.equal(location.url(), SECOND_URL)
              done()
            })
          })
        })
      })
    })

    it('should wait for onbeforeload before loading the next page', (done) => {
      let callback

      location.go({ url: FIRST_URL }, () => {
        location.go({ url: SECOND_URL, onbeforeload: waitForCallback }, () => {
          // After both pages have been loaded
          location.back(() => {
            location.forward(() => {
              assert.equal(location.url(), SECOND_URL)
              done()
            })
          })
          // Wait for callback from onbeforeload before loading the next page
          assert.notEqual(location.url(), SECOND_URL)
          callback()
        })
        // Load the second page for the first time
        callback()
      })

      function waitForCallback (cb) { callback = cb }
    })

    it('should call onafterunload after unloading the current page', (done) => {
      let testing = false
      let functionCalled = false

      location.go({ url: FIRST_URL, onafterunload: firstUnloaded }, () => {
        location.go({ url: SECOND_URL }, () => {
          location.back(() => {
            testing = true
            location.forward(() => {
              assert.ok(functionCalled)
              done()
            })
          })
        })
      })

      function firstUnloaded () {
        // Ignore when the method is called via location.go
        if (!testing) return
        functionCalled = true
        assert.notEqual(location.url(), FIRST_URL)
      }
    })
  })
})
