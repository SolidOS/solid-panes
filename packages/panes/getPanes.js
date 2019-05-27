const path = require('path')
const fs = require('fs')

function getPanes () {
  const paneNames = fs.readdirSync(__dirname)
    .filter(fileOrDir => fs.statSync(path.join(__dirname, fileOrDir)).isDirectory())
    .filter(directory => directory !== 'webpack-config-panes')

  const panes = paneNames.map(name => ({ name: name, path: getPaneDir(name) }))

  return panes
}

function getPaneDir (pane) {
  return path.join(__dirname, pane)
}

module.exports = getPanes
