const path = require('path')

function getPanes () {
  const paneNames = ['scratchpad']

  const panes = paneNames.map(name => ({ name: name, path: getPaneDir(name) }))

  return panes
}

function getPaneDir (pane) {
  return path.join(__dirname, pane)
}

module.exports = getPanes
