import { describe, expect, it } from 'vitest'
import { graph, namedNode } from 'rdflib'
import { RDFXMLPane } from '../../src/RDFXMLPane'
import { n3Pane } from '../../src/n3Pane'

function renderPane (pane: typeof RDFXMLPane | typeof n3Pane) {
  const store = graph()
  const subject = namedNode('https://pod.example/card')
  store.add(subject, namedNode('https://pod.example/name'), namedNode('https://pod.example/name'))
  const context = {
    dom: document,
    session: { store }
  } as any

  return pane.render(subject, context).querySelector('solid-panes-editor-card') as HTMLElement & {
    contentType?: string
    accessibilityLabel?: string
    accessibilityDescription?: string
  }
}

describe('RDF serialization panes', () => {
  it('labels generated RDF/XML as a read-only serialization for the resource', () => {
    const source = renderPane(RDFXMLPane)

    expect(source.contentType).toBe('application/rdf+xml')
    expect(source.accessibilityLabel).toBe('Generated RDF/XML for https://pod.example/card')
    expect(source.accessibilityDescription)
      .toBe('Generated RDF/XML serialization. This content is read-only.')
  })

  it('labels generated N3 as a read-only serialization for the resource', () => {
    const source = renderPane(n3Pane)

    expect(source.contentType).toBe('text/n3')
    expect(source.accessibilityLabel).toBe('Generated N3 for https://pod.example/card')
    expect(source.accessibilityDescription)
      .toBe('Generated N3 serialization. This content is read-only.')
  })
})
