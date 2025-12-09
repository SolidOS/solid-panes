import * as paneRegistry from 'pane-registry'
import * as $rdf from 'rdflib'
import { solidLogicSingleton, store, authSession } from 'solid-logic'
import { getOutliner } from '../src'
import Pane from 'profile-pane'

async function renderPane (uri: string) {
  if (!uri) {
    console.log("usage renderPane('http://example.com/#this')", uri)
    return
  }
  const subject = $rdf.sym(uri)
  const doc = subject.doc()

  await new Promise((resolve, reject) => {
    store.fetcher.load(doc).then(resolve, reject)
  })
  const context = {
    // see https://github.com/solidos/solid-panes/blob/005f90295d83e499fd626bd84aeb3df10135d5c1/src/index.ts#L30-L34
    dom: document,
    getOutliner,
    session: {
      store: store,
      paneRegistry,
      logic: solidLogicSingleton
    }
  }

  console.log(subject, context)
  const icon = createIconElement(Pane)
  const paneDiv = Pane.render(subject, context)
  
  const target = document.getElementById('render')
  target.innerHTML = ''
  target.appendChild(icon)
  target.appendChild(paneDiv)
}

function createIconElement (Pane) {
  const icon = Pane.icon
  const img = document.createElement('img')
  img.src = icon
  img.width = 40
  return img
}

window.onload = async () => {
  console.log('document ready')
  // registerPanes((cjsOrEsModule: any) => paneRegistry.register(cjsOrEsModule.default || cjsOrEsModule))
  paneRegistry.register(require('contacts-pane'))
  await authSession.handleIncomingRedirect({
    restorePreviousSession: true
  })
  const session = await authSession
  if (!session.info.isLoggedIn) {
    console.log('The user is not logged in')
    document.getElementById('loginBanner').innerHTML =
      '<button onclick="login()">Log in</button>'
  } else {
    console.log(`Logged in as ${session.info.webId}`)

    document.getElementById(
      'loginBanner'
    ).innerHTML = `Logged in as ${session.info.webId} <button onclick="logout()">Log out</button>`
  }
  renderPane('https://testingsolidos.solidcommunity.net/profile/card#me')

}
window.logout = () => {
  authSession.logout()
  window.location = ''
}
window.login = async function () {
  const session = await authSession
  if (!session.info.isLoggedIn) {
    const issuer = prompt('Please enter an issuer URI', 'https://solidcommunity.net')
    await authSession.login({
      oidcIssuer: issuer,
      redirectUrl: window.location.href,
      clientName: 'Solid Panes Dev Loader'
    })
  }
};
(window as any).renderPane = renderPane
console.log("Pane at runtime:", Pane); window.Pane = Pane;
