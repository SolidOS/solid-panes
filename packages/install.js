const getPanes = require('./panes/getPanes')
const concurrently = require('concurrently')

install()

async function install () {
  const panes = getPanes()

  const installCommands = panes.map(({ name, path }) => ({
    command: `cd ${path}; npm install`,
    name: `install ${name}`
  }))
  await concurrently(installCommands)
}
