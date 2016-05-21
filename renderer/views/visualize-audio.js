module.exports = visualizeAudio

function visualizeAudio (e) {
  var audioCtx = new window.AudioContext()
  var analyser = audioCtx.createAnalyser()
  analyser.fftSize = 32
  analyser.connect(audioCtx.destination)

  var source = audioCtx.createMediaElementSource(e.target)
  source.connect(analyser)

  // visualizations for audio are rendered outside of the hyperx context

  var canvas = document.querySelector('.visualizer')
  if (canvas) {
    var canvasCtx = canvas.getContext('2d')
    var WIDTH = canvas.width
    var HEIGHT = canvas.height
    var bufferLength = analyser.frequencyBinCount
    var dataArray = new Uint8Array(bufferLength)
  }

  function draw () {
    analyser.getByteFrequencyData(dataArray)

    canvasCtx.fillStyle = 'rgb(0, 0, 0)'
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

    var barPadding = 2
    var barWidth = (WIDTH - (2 * bufferLength)) / bufferLength
    var barHeight
    var x = 0

    for (var i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i]

      canvasCtx.fillStyle = 'rgb(239,51,76)'
      canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2)

      x += barWidth + barPadding
    }

    if (isRunning) window.requestAnimationFrame(() => draw())
  }

  var isRunning = false
  return {
    start: function () {
      if (isRunning) return
      isRunning = true
      draw()
    },
    stop: function () {
      isRunning = false
    }
  }
}
