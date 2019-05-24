/**
 * This should be run from one of package.json's `script`s,
 * and is used to build all pane packages embedded in this repository.
 * This allows them to be developed and published as separate projects,
 * but still included automatically when running solid-panes locally.
 *
 * The build process is split in three steps:
 * 1. Collect a list of all embedded packages
 * 2. Build them once
 * 3. Watch them all for changes and rebuild if necessary
 *
 * Step 2 and step 3 both build the embedded packages. That sounds redundant,
 * but both are necessary: in tandem with step 3, a watch process is started
 * for solid-panes. Since that process might be looking for the embedded panes
 * to be present before they have compiled for the first time, the first
 * compilation is run explicitly.
 */

const getPanes = require('./panes/getPanes')
const concurrently = require('concurrently')

initialise()

async function initialise () {
  // Step 1: collect a list of embedded packages
  const panes = getPanes()

  // Step 2: run an initial build
  const initialBuildCommands = panes.map(({ name, path }) => ({
    command: `cd ${path}; npm run build-dev`,
    name: `build ${name}`
  }))
  await concurrently(initialBuildCommands)

  // Step 3: watch embedded packages for changes and rebuild when changed
  const watchCommands = panes.map(({ name, path }) => ({
    command: `cd ${path}; npm run watch`,
    name: `watch ${name}`
  }))
  // (also make sure that we build solid-panes itself and watch for changes:)
  watchCommands.push({ command: 'npm run watch', name: 'watch solid-panes' })
  concurrently(watchCommands)
}
