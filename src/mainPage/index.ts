/*   Main Page
 **
 **  This code is called in mashlib and renders the header and footer of the Databrowser.
 */

import { LiveStore, NamedNode } from 'rdflib'
<<<<<<< HEAD
import { authSession, authn } from 'solid-logic'
import { getOutliner } from '../index'
import { createHeader } from './header'
=======
import { getOutliner, OutlineManager } from '../index'
import { createHeader, refreshHeader } from './header'
>>>>>>> main
import { createFooter } from './footer'
import { createLeftSideMenu, refreshMenu } from './menu'

<<<<<<< HEAD
export default async function initMainPage (store: LiveStore, uri?: string | NamedNode | null) {
  const outliner = getOutliner(document)
  const hasExplicitUriArg = uri !== undefined && uri !== null
  const locationUrl = new URL(window.location.href)
  const explicitUriQuery = locationUrl.searchParams.get('uri')
  const isLoggedIn = !!(authSession.info && authSession.info.isLoggedIn)
  const isBareAppRoot = locationUrl.pathname === '/' && !locationUrl.search && !locationUrl.hash

  if (isBareAppRoot && !hasExplicitUriArg && explicitUriQuery === null) {
    // At bare app root, avoid fetching '/' as data. If logged in, land on the user's profile instead.
    let me = authn.currentUser()
    if (isLoggedIn && !me) {
      let webId = await authn.checkUser()
      if (!webId) {
        // Some IdP/session states resolve slightly after app bootstrap.
        await new Promise(resolve => setTimeout(resolve, 300))
        webId = await authn.checkUser()
      }
      if (typeof webId === 'string') {
        me = store.sym(webId)
      }
    }
    if (isLoggedIn && me) {
      outliner.GotoSubject(me, true, undefined, true, undefined)
    } else if (isLoggedIn) {
      // Optional override: set localStorage.solidosSafeLandingUri to a public resource URI.
      const configuredLandingUri = window.localStorage.getItem('solidosSafeLandingUri')
      if (configuredLandingUri) {
        try {
          const fallbackUrl = new URL(configuredLandingUri, locationUrl.origin)
          const protocol = fallbackUrl.protocol
          // Only allow safe HTTP(S) protocols, and avoid redirecting back to bare app root.
          if ((protocol === 'http:' || protocol === 'https:') &&
            !(fallbackUrl.origin === locationUrl.origin && fallbackUrl.pathname === '/')) {
            outliner.GotoSubject(store.sym(fallbackUrl.toString()), true, undefined, true, undefined)
          }
        } catch {
          // Ignore invalid configuredLandingUri values.
        }
      }
    }
  } else {
    uri = uri || window.location.href
    let subject = uri
    if (typeof uri === 'string') subject = store.sym(uri)
    outliner.GotoSubject(subject, true, undefined, true, undefined)
  }
=======
export { refreshMenu as updateMenuLayout } from './menu'
export { refreshHeader } from './header'

function ensureMainContent () {
  let main = document.getElementById('MainContent') as HTMLElement | null
  if (!main) {
    main = document.createElement('main')
    main.id = 'MainContent'
    main.setAttribute('role', 'main')
    main.setAttribute('tabindex', '-1')
    main.setAttribute('aria-live', 'polite')
    document.body.appendChild(main)
  }
  return main
}

export async function initMainPage (
  store: LiveStore,
  uri?: string | NamedNode | null,
  environment?: any
) {
  ensureMainContent()
  const outliner = getOutliner(document, environment)
  uri = uri || window.location.href
  const subject: NamedNode = typeof uri === 'string' ? store.sym(uri) : uri
  outliner.GotoSubject(subject, true, undefined, true, undefined)
>>>>>>> main

  const header = await createHeader(store, outliner)
  const menu = createLeftSideMenu(subject, outliner)
  const footer = menu.then(() => createFooter(store))
  return Promise.all([header, menu, footer])
}

export async function refreshUI (outliner: OutlineManager) {
  await refreshHeader(outliner)
  refreshMenu(outliner.context.environment?.layout === 'mobile' ? 'mobile' : 'desktop')
}
