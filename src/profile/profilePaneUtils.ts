import { Node, IndexedFormula, NamedNode } from 'rdflib'
import { Namespaces } from 'solid-namespace'
import { DataBrowserContext } from 'pane-registry'

export function getLabel (subject: Node, kb: IndexedFormula, ns: Namespaces) {
  var types = kb.findTypeURIs(subject)
  if (types[ns.foaf('Person').uri] || types[ns.vcard('Individual').uri]) {
    return 'Your Profile'
  }
  return 'Edit your profile' // At the moment, just allow on any object. Like home pane
}

export function paneDiv (
  context: DataBrowserContext,
  subject: NamedNode,
  paneName: string
): HTMLElement {
  const view = context.session.paneRegistry.byName(paneName)
  if (!view) {
    const warning = context.dom.createElement('div')
    warning.innerText = `Unable to load view: ${paneName}`
    return warning
  }
  const viewContainer = view.render(subject, context)
  viewContainer.setAttribute(
    'style',
    'border: 0.3em solid #444; border-radius: 0.5em'
  )
  return viewContainer
}
