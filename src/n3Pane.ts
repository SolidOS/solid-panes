/*      Notation3 content Pane
 **
 **  This pane shows the content of a particular RDF resource
 ** or at least the RDF semantics we attribute to that resource,
 ** in generated N3 syntax.
 */
import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'
import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode, Statement } from 'rdflib'
import './n3Pane.css'
import './components/editor-card/EditorCard'

const ns = UI.ns

type N3PaneLike = {
  icon: string
  name: string
  audience: NamedNode[]
  label: (subject: NamedNode, context: DataBrowserContext) => string | null
  render: (subject: NamedNode, context: DataBrowserContext) => HTMLDivElement
}

export const n3Pane: N3PaneLike = {
  icon: UI.icons.originalIconBase + 'w3c/n3_smaller.png',

  name: 'n3',

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
    return 'Data (' + n + ') as N3'
  },

  render: function (
    subject: NamedNode,
    context: DataBrowserContext
  ): HTMLDivElement {
    const myDocument = context.dom
    const kb = context.session.store

    const div = myDocument.createElement('div')
    div.setAttribute('class', 'n3-pane')
    // Because of smushing etc, this will not be a copy of the original source
    // We could instead either fetch and re-parse the source,
    // or we could keep all the pre-smushed triples.
    const statements = kb.statementsMatching(
      undefined,
      undefined,
      undefined,
      subject
    ) as Statement[] // @@ slow with current store!

    const sz = $rdf.Serializer(kb)
    sz.suggestNamespaces(kb.namespaces)
    sz.setBase(subject.uri)
    const serializedContent = sz.statementsToN3(statements)
    const source = myDocument.createElement('solid-panes-editor-card') as HTMLElement & {
      contentType?: string
      content?: string
    }
    source.contentType = 'text/n3'
    source.content = serializedContent

    div.appendChild(source)
    return div
  }
}
