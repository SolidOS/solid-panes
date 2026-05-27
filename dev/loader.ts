
import * as paneRegistry from 'pane-registry'
import * as $rdf from 'rdflib'
import { solidLogicSingleton, store, authSession } from 'solid-logic'
import { getOutliner, initMainPage, refreshUI } from '../src'
import Pane from 'profile-pane'
import './dev-mash.css'
import { DataBrowserContext, RenderEnvironment } from 'pane-registry'

// Add custom properties to the Window interface for TypeScript
declare global {
  interface Window {
    logout: () => void;
    login: () => Promise<void>;
    renderMainPage: typeof renderMainPage;
    renderPane: typeof renderPane;
    setLayout: (layout: 'mobile' | 'desktop') => Promise<void>;
    Pane: typeof Pane;
  }
}

const DEFAULT_URI = 'https://testingsolidos.solidcommunity.net/profile/card#me'

function getEnvironment (layout: 'mobile' | 'desktop' = 'desktop'): RenderEnvironment {
  return {
    layout,
    layoutPreference: layout,
    inputMode: 'pointer',
    theme: 'light',
    viewport: layout === 'mobile'
      ? { width: 375, height: 812 }
      : { width: 1280, height: 800 }
  }
}

async function renderMainPage (uri: string = DEFAULT_URI, layout: 'mobile' | 'desktop' = 'desktop') {
  await initMainPage(store as any, uri, getEnvironment(layout))
}

async function setLayout (layout: 'mobile' | 'desktop') {
  const outliner = getOutliner(document)
  outliner.context = outliner.context || {}
  outliner.context.environment = {
    ...(outliner.context.environment || {}),
    ...getEnvironment(layout)
  }
  await refreshUI(outliner)
}

function addLayoutButtons () {
  let controls = document.getElementById('layoutControls')
  if (!controls) {
    controls = document.createElement('div')
    controls.id = 'layoutControls'
    controls.style.margin = '0.5rem 0'
    const title = document.createElement('strong')
    title.textContent = 'Menu layout preview: '
    controls.appendChild(title)

    const desktopButton = document.createElement('button')
    desktopButton.textContent = 'Desktop'
    desktopButton.onclick = () => setLayout('desktop')
    controls.appendChild(desktopButton)

    const mobileButton = document.createElement('button')
    mobileButton.textContent = 'Mobile'
    mobileButton.style.marginLeft = '0.5rem'
    mobileButton.onclick = () => setLayout('mobile')
    controls.appendChild(mobileButton)

    document.body.insertBefore(controls, document.body.firstChild)
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
  const contactsPane = await import('contacts-pane')
  paneRegistry.register((contactsPane as any).default || contactsPane)
  await solidLogicSingleton.authn.checkUser()
  const session = authSession
  const isLoggedIn = session?.info?.isLoggedIn ?? session?.isActive ?? Boolean(session?.webId)
  if (!isLoggedIn) {
    console.log('The user is not logged in')
    const loginBanner = document.getElementById('loginBanner');
    if (loginBanner) {
      loginBanner.innerHTML = '<button onclick="login()">Log in</button>';
    }
    } else {
      const loggedWebId = session?.info?.webId || session?.webId
      console.log(`Logged in as ${loggedWebId}`)
    
    const loginBanner = document.getElementById('loginBanner');
    if (loginBanner) {
      loginBanner.innerHTML = `Logged in as ${loggedWebId} <button onclick="logout()">Log out</button>`;
    }
  }
  addLayoutButtons()
  await renderMainPage(DEFAULT_URI, 'desktop')
}
window.logout = () => {
  authSession.logout()
  window.location.href = ''
}
window.login = async function () {
  const session = authSession
  const isLoggedIn = session?.info?.isLoggedIn ?? session?.isActive ?? Boolean(session?.webId)
  if (!isLoggedIn) {
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
;(window as any).renderMainPage = renderMainPage
;(window as any).setLayout = setLayout
console.log("Pane at runtime:", Pane); window.Pane = Pane;
