const fs = require('fs')
const path = require('path')
const util = require('util')
const pluginManager = require('./pluginManager')
const config = require('./pluginManager.config.js')

init()

async function init () {
  const pathToSearch = path.join(process.cwd(), 'node_modules')
  const items = await util.promisify(fs.readdir)(pathToSearch)
  try {
    const loadingPanes = items
      .filter(moduleName => moduleName.match(/solid-pane-/))
      .map(name => ({name, module: require(name)}))
      .filter(plugin => plugin.module.installAsPane)
      .map(async (plugin) => {
        await plugin.module.installAsPane(pluginManager)
        return {name: plugin.name}
      })
    const panes = await Promise.all(loadingPanes)
    await util.promisify(fs.writeFile)('./pluginManager.config.js', createConfigFile(panes))
  } catch (error) {
    console.log(error)
  }
}

function createConfigFile (panes) {
  return `module.exports = ${JSON.stringify({
    ...config,
    panes: panes.map(pane => ({
      ...pane,
      module: `require('./${config.src}/${pane.name}/index.js')`
    }))
  }, null, 2)}`.replace(/"require\((\S+)/g, (match, filePath) => {
    return `require(${filePath.substr(0, filePath.length - 2)})`
  })
}
