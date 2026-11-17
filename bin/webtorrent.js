#!/usr/bin/env node

/*
 * Global CLI launcher for WebTorrent Desktop.
 * Installed as the `webtorrent` command via `npm link`.
 */

const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const appDir = path.resolve(__dirname, '..')

if (!fs.existsSync(path.join(appDir, 'build', 'main'))) {
  console.error('WebTorrent is not built. Run "npm run build" in ' + appDir)
  process.exit(1)
}

// The `electron` npm package exports the path to its bundled binary.
const electron = require('electron')

const args = ['--no-sandbox', appDir, ...process.argv.slice(2)]

const child = spawn(electron, args, {
  cwd: appDir,
  stdio: 'inherit'
})

child.on('error', (err) => {
  console.error('Failed to start Electron:', err.message)
  process.exit(1)
})

// Forward termination signals so closing the terminal never orphans Electron.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (child.killed) return
    child.kill(signal)

    // Electron can ignore SIGTERM while busy, so force-kill as a fallback.
    const forceTimer = setTimeout(() => {
      child.kill('SIGKILL')
      process.exit(0)
    }, 3000)
    forceTimer.unref()
    child.once('exit', () => clearTimeout(forceTimer))
  })
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code === null ? 1 : code)
})
