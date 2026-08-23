/*      RDF/XML content Pane
 **
 **  This pane shows the content of a particular RDF resource
 ** or at least the RDF semantics we attribute to that resource,
 ** in generated N3 syntax.
 */

import { ns, icons } from 'solid-ui'
import type { DataBrowserContext } from 'pane-registry'
import { Serializer, type NamedNode, type Statement } from 'rdflib'
import './RDFXMLPane.css'
import './components/editor-card'

type RDFXMLPaneDefinition = {
  icon: string
  name: string
  audience: NamedNode[]
  label: (subject: NamedNode, context: DataBrowserContext) => string | null
  render: (subject: NamedNode, context: DataBrowserContext) => HTMLDivElement
}

export const RDFXMLPane: RDFXMLPaneDefinition = {
  icon: icons.originalIconBase + '22-text-xml4.png',

  name: 'RDFXML',

  audience: [ns.solid('Developer')],

  label: function (subject: NamedNode, context: DataBrowserContext): string | null {
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
    return 'As RDF/XML (' + n + ')'
  },

  render: function (
    subject: NamedNode,
    context: DataBrowserContext
  ): HTMLDivElement {
    const myDocument = context.dom
    const kb = context.session.store

    const div = myDocument.createElement('div')
    div.setAttribute('class', 'rdfxml-pane')
    // Because of smushing etc, this will not be a copy of the original source
    // We could instead either fetch and re-parse the source,
    // or we could keep all the pre-smushed triples.
    const statements = kb.statementsMatching(
      undefined,
      undefined,
      undefined,
      subject
    ) as Statement[]

    const sz = Serializer(kb)
    sz.suggestNamespaces(kb.namespaces)
    sz.setBase(subject.uri)
    const serializedContent = sz.statementsToXML(statements)
    const source = myDocument.createElement('solid-panes-editor-card') as HTMLElement & {
      contentType?: string
      content?: string
    }
    source.contentType = 'application/rdf+xml'
    source.content = serializedContent

    div.appendChild(source)
    return div
  }
}
