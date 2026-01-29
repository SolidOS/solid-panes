/*      Notation3 content Pane
 **
 **  This pane shows the content of a particular RDF resource
 ** or at least the RDF semantics we attribute to that resource,
 ** in generated N3 syntax.
 */
import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'

const ns = UI.ns

export const n3Pane = {
  icon: UI.icons.originalIconBase + 'w3c/n3_smaller.png',

  name: 'n3',

  audience: [ns.solid('Developer')],

  label: function (subject, context) {
    // Don't match markdown files - let humanReadablePane handle those
    if (subject.uri && (subject.uri.endsWith('.md') || subject.uri.endsWith('.markdown'))) {
      return null
    }
    const store = context.session.store
    if (
      'http://www.w3.org/2007/ont/link#ProtocolEvent' in
      store.findTypeURIs(subject)
    ) {
      return null
    }
    const n = store.statementsMatching(undefined, undefined, undefined, subject)
      .length
    if (n === 0) return null
    return 'Data (' + n + ') as N3'
  },

  render: function (subject, context) {
    const myDocument = context.dom
    const kb = context.session.store
    const div = myDocument.createElement('div')
    div.setAttribute('class', 'n3Pane')
    // Because of smushing etc, this will not be a copy of the original source
    // We could instead either fetch and re-parse the source,
    // or we could keep all the pre-smushed triples.
    const sts = kb.statementsMatching(undefined, undefined, undefined, subject) // @@ slow with current store!
    /*
    var kludge = kb.formula([]) // No features
    for (var i=0; i< sts.length; i++) {
        s = sts[i]
        kludge.add(s.subject, s.predicate, s.object)
    }
    */
    const sz = $rdf.Serializer(kb)
    sz.suggestNamespaces(kb.namespaces)
    sz.setBase(subject.uri)
    const str = sz.statementsToN3(sts)
    const pre = myDocument.createElement('PRE')
    pre.appendChild(myDocument.createTextNode(str))
    div.appendChild(pre)
    return div
  }
}
