const fs = require('fs')
const path = require('path')
const config = require('./pluginManager.config.js')
const util = require('util')

class PluginManager {
  async copyFile (src, pluginName, fileName) {
    ensureDirectory(path.join(process.cwd(), config.src, pluginName))
    const dest = path.join(process.cwd(), config.src, pluginName, fileName)
    return util.promisify(fs.copyFile)(src, dest)
  }

  load (panes) {
    config.panes.forEach(({ module }) => panes.register(module))
  }
}

function ensureDirectory (path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

module.exports = new PluginManager()
