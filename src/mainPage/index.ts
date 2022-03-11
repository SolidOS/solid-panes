/*   Main Page
 **
 **  This code is called in mashlib and renders the header and footer of the Databrowser.
 */

import { IndexedFormula, NamedNode } from 'rdflib'
import { getOutliner } from '../index'
import { createHeader } from './header'
import { createFooter } from './footer'

export default async function initMainPage (store: IndexedFormula, uri?: string|NamedNode|null) {
  const outliner = getOutliner(document)
  uri = uri || window.location.href
  let subject = uri
  if (typeof uri === 'string') subject = store.sym(uri)
  outliner.GotoSubject(subject, true, undefined, true, undefined)
  const header = await createHeader(store, outliner)
  const footer = createFooter(store)
  return Promise.all([header, footer])
}
