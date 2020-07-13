const Pane = require('./pane').default
const $rdf = require('rdflib')
const UI = require('solid-ui')
import * as paneRegistry from 'pane-registry'
const SolidAuth = require('solid-auth-client')
// import registerPanes from '../src/registerPanes'

// FIXME:
window.$rdf = $rdf

async function renderPane () {
  const uri = document.getElementById('subject').getAttribute('value')
  console.log('renderPane', uri)
  const subject = $rdf.sym(uri)
  const doc = subject.doc()

  await new Promise((resolve, reject) => {
    UI.store.fetcher.load(doc).then(resolve, reject)
  })
  const context = { // see https://github.com/solid/solid-panes/blob/005f90295d83e499fd626bd84aeb3df10135d5c1/src/index.ts#L30-L34
    dom: document,
    session: {
      store: UI.store,
      paneRegistry
    }
  }
  const options = {}
  console.log(Pane)
  const paneDiv = Pane.render(subject, context, options)
  document.getElementById('render').innerHTML=""
  document.getElementById('render').appendChild(paneDiv)
}

document.addEventListener('DOMContentLoaded', renderPane)

window.onload = () => {
  console.log('document ready')
  // registerPanes((cjsOrEsModule: any) => paneRegistry.register(cjsOrEsModule.default || cjsOrEsModule))
  paneRegistry.register(require('contacts-pane'))

  SolidAuth.trackSession(session => {
    if (!session) {
      console.log('The user is not logged in')
      document.getElementById('loginBanner').innerHTML = '<button onclick="popupLogin()">Log in</button>'
    } else {
      console.log(`Logged in as ${session.webId}`)

      document.getElementById('loginBanner').innerHTML = `Logged in as ${session.webId} <button onclick="logout()">Log out</button>`
    }
  })
  renderPane()
}
window.logout = () => {
  SolidAuth.logout()
  window.location = ''
}
window.popupLogin = async function () {
  let session = await SolidAuth.currentSession()
  const popupUri = 'https://solid.community/common/popup.html'
  if (!session) {
    session = await SolidAuth.popupLogin({ popupUri })
  }
}
