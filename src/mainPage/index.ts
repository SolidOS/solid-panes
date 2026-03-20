/*   Main Page
 **
 **  This code is called in mashlib and renders the header and footer of the Databrowser.
 */

import { LiveStore, NamedNode } from 'rdflib'
import { authSession, authn } from 'solid-logic'
import { getOutliner } from '../index'
import { createHeader } from './header'
import { createFooter } from './footer'

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
        const fallbackUrl = new URL(configuredLandingUri, locationUrl.origin)
        if (!(fallbackUrl.origin === locationUrl.origin && fallbackUrl.pathname === '/')) {
          outliner.GotoSubject(store.sym(fallbackUrl.toString()), true, undefined, true, undefined)
        }
      }
    }
  } else {
    uri = uri || window.location.href
    let subject = uri
    if (typeof uri === 'string') subject = store.sym(uri)
    outliner.GotoSubject(subject, true, undefined, true, undefined)
  }

  const header = await createHeader(store, outliner)
  const footer = createFooter(store)
  return Promise.all([header, footer])
}
