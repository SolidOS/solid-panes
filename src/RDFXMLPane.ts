/*      RDF/XML content Pane
 **
 **  This pane shows the content of a particular RDF resource
 ** or at least the RDF semantics we attribute to that resource,
 ** in generated N3 syntax.
 */

import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'
import type { DataBrowserContext, RenderEnvironment } from 'pane-registry'
import type { NamedNode, Statement } from 'rdflib'
import './RDFXMLPane.css'

const ns = UI.ns

type RDFXMLPaneDefinition = {
  icon: string
  name: string
  audience: NamedNode[]
  label: (subject: NamedNode, context: DataBrowserContext) => string | null
  render: (subject: NamedNode, context: DataBrowserContext) => HTMLDivElement
}

function leadingIndentWidth (line: string): number {
  if (line.trim().length === 0) {
    return 0
  }

  let width = 0
  for (const character of line) {
    if (character === ' ') {
      width += 1
      continue
    }
    if (character === '\t') {
      width += 2
      continue
    }
    break
  }
  return Math.max(width, 2)
}

function trimLeadingIndent (line: string): string {
  return line.replace(/^[ \t]+/, '')
}

export const RDFXMLPane: RDFXMLPaneDefinition = {
  icon: UI.icons.originalIconBase + '22-text-xml4.png',

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

    function applyEnvironmentAttributes (element: HTMLDivElement): void {
      const environment = (context.environment ?? {}) as Partial<RenderEnvironment>
      element.dataset.layout = environment.layout ?? 'desktop'
    }

    const div = myDocument.createElement('div')
    div.setAttribute('class', 'rdfxml-pane')
    applyEnvironmentAttributes(div)
    // Because of smushing etc, this will not be a copy of the original source
    // We could instead either fetch and re-parse the source,
    // or we could keep all the pre-smushed triples.
    const sts = kb.statementsMatching(
      undefined,
      undefined,
      undefined,
      subject
    ) as Statement[] // @@ slow with current store!
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
    const str = sz.statementsToXML(sts)
    const source = myDocument.createElement('div')
    source.classList.add('rdfxml-pane__source')

    str.split('\n').forEach(line => {
      const lineElement = myDocument.createElement('div')
      const indentElement = myDocument.createElement('span')
      const contentElement = myDocument.createElement('span')
      const indentWidth = leadingIndentWidth(line)

      lineElement.classList.add('rdfxml-pane__line')
      lineElement.style.setProperty('--rdfxml-indent', `${indentWidth}ch`)

      indentElement.classList.add('rdfxml-pane__line-indent')
      indentElement.setAttribute('aria-hidden', 'true')

      contentElement.classList.add('rdfxml-pane__line-content')
      contentElement.textContent = line.length > 0 ? trimLeadingIndent(line) : ' '

      lineElement.appendChild(indentElement)
      lineElement.appendChild(contentElement)
      source.appendChild(lineElement)
    })

    div.appendChild(source)
    return div
  }
}

// ends
