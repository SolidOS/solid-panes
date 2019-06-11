import { Node, IndexedFormula } from 'rdflib'
import { Namespaces } from 'solid-namespace'

export function getLabel (subject: Node, kb: IndexedFormula, ns: Namespaces) {
  var types = kb.findTypeURIs(subject)
  if (types[ns.foaf('Person').uri] || types[ns.vcard('Individual').uri]) {
    return 'Your Profile'
  }
  return 'Edit your profile' // At the moment, just allow on any object. Like home pane
}
