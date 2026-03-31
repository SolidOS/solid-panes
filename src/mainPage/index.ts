/*   Main Page
 **
 **  This code is called in mashlib and renders the header and footer of the Databrowser.
 */

import { LiveStore, NamedNode } from 'rdflib'
import { getOutliner } from '../index'
import { createHeader } from './header'
import { createFooter } from './footer'
import { initResponsiveMenu } from './menu'

export { updateMenuLayout } from './menu'

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
  let subject = uri
  if (typeof uri === 'string') subject = store.sym(uri)
  outliner.GotoSubject(subject, true, undefined, true, undefined)

  const header = await createHeader(store, outliner)
  const menu = initResponsiveMenu(outliner)
  const footer = createFooter(store)
  return Promise.all([header, menu, footer])
}
