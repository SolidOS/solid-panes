
import * as paneRegistry from 'pane-registry'
import * as $rdf from 'rdflib'
import { solidLogicSingleton, store, authSession } from 'solid-logic'
import { getOutliner } from '../src'
import Pane from 'profile-pane'
import './dev-mash.css'
import { DataBrowserContext, RenderEnvironment } from 'pane-registry'

// Add custom properties to the Window interface for TypeScript
declare global {
  interface Window {
    logout: () => void;
    login: () => Promise<void>;
    renderPane: typeof renderPane;
    Pane: typeof Pane;
  }
}

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

  const devEnvironment : RenderEnvironment = {
    layout: 'desktop', // or 'mobile'
    layoutPreference: 'desktop', // or 'mobile' or 'auto'
    inputMode: 'pointer', // or 'touch'
    theme: 'light', // or 'dark'
    viewport: { width: 800, height: 480 } // this is the default viewport for the browser window
  }
  const context : DataBrowserContext = {
    // see https://github.com/solidos/solid-panes/blob/005f90295d83e499fd626bd84aeb3df10135d5c1/src/index.ts#L30-L34
    dom: document,
    getOutliner,
    session: {
      store: store,
      paneRegistry,
      logic: solidLogicSingleton
    },
    environment: devEnvironment
  }

  console.log(subject, context)
  const icon = createIconElement(Pane)
  const paneDiv = Pane.render(subject, context)
  
  const target = document.getElementById('render')
  if (target) {
    target.innerHTML = ''
    target.appendChild(icon)
    target.appendChild(paneDiv)
  } else {
    console.error("Element with id 'render' not found.")
  }
}

function createIconElement (Pane: { icon: string }) {
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
    const loginBanner = document.getElementById('loginBanner');
    if (loginBanner) {
      loginBanner.innerHTML = '<button onclick="login()">Log in</button>';
    }
    } else {
      console.log(`Logged in as ${session.info.webId}`)
    
    const loginBanner = document.getElementById('loginBanner');
    if (loginBanner) {
      loginBanner.innerHTML = `Logged in as ${session.info.webId} <button onclick="logout()">Log out</button>`;
    }
  }
  renderPane('https://testingsolidos.solidcommunity.net/profile/card#me')
}
window.logout = () => {
  authSession.logout()
  window.location.href = ''
}
window.login = async function () {
  const session = await authSession
  if (!session.info.isLoggedIn) {
    const issuer = prompt('Please enter an issuer URI', 'https://solidcommunity.net')
    if (issuer) {
      await authSession.login({
        oidcIssuer: issuer,
        redirectUrl: window.location.href,
        clientName: 'Solid Panes Dev Loader'
      })
    } else {
      console.warn('Login cancelled: No issuer provided.')
    }
  }
};
(window as any).renderPane = renderPane
console.log("Pane at runtime:", Pane); window.Pane = Pane;
