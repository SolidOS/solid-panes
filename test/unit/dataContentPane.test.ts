import { describe, expect, it } from 'vitest'
import { Collection, graph, literal, namedNode, parse, sym } from 'rdflib'
import { dataContentPane } from '../../src/dataContentPane'

function context (store: any) {
  return { dom: document, session: { store } } as any
}

describe('data content pane', () => {
  it('preserves responsive table classes when rendering a nested formula', () => {
    const store = graph()
    parse(
      '<#me> <#example> { <#item> <#label> "Nested formula example". }.',
      store, 'https://pod.example/card', 'text/n3'
    )
    const renderContext = context(store)
    renderContext.session.paneRegistry = { byName: () => dataContentPane }

    const table = dataContentPane.statementsAsTables(store.statements, renderContext)
    const formula = table.querySelector('.data-content-pane__nested-formula')

    expect(formula).toHaveClass('data-content-pane__table', 'data-content-pane__table--root')
    expect(formula).toHaveTextContent('Nested formula example')
  })

  it('keeps header IDs unique across nested and separate renders', () => {
    const store = graph()
    const subject = namedNode('https://pod.example/item')
    const predicate = namedNode('https://pod.example/name')
    store.add(subject, predicate, literal('One'))
    store.add(
      subject,
      namedNode('https://pod.example/example'),
      store.formula([])
    )
    const renderContext = context(store)
    renderContext.session.paneRegistry = { byName: () => dataContentPane }

    const first = dataContentPane.statementsAsTables(
      store.statementsMatching(subject),
      renderContext
    )
    const second = dataContentPane.statementsAsTables(
      store.statementsMatching(subject),
      renderContext
    )
    const ids = [
      ...first.querySelectorAll<HTMLElement>('[id]'),
      ...second.querySelectorAll<HTMLElement>('[id]')
    ].map(element => element.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const valueCell of [
      ...first.querySelectorAll<HTMLElement>('[headers]'),
      ...second.querySelectorAll<HTMLElement>('[headers]')
    ]) {
      expect(ids).toContain(valueCell.getAttribute('headers'))
    }
  })

  it('exposes RDF relationships and literal language metadata', () => {
    const store = graph()
    const subject = sym('https://pod.example/item')
    const predicate = sym('https://pod.example/name')
    store.add(subject, predicate, literal('Bonjour', 'fr'))
    store.add(subject, predicate, literal('Au revoir', 'fr'))

    const table = dataContentPane.statementsAsTables(
      store.statementsMatching(subject),
      context(store)
    )
    const value = table.querySelector('.data-content-pane__value-cell')
    const predicateHeader = table.querySelector('.data-content-pane__predicate-cell')

    expect(table.querySelector('th[scope="row"]')).toBeTruthy()
    expect(predicateHeader).toBeTruthy()
    expect(Array.from(table.querySelectorAll('[lang="fr"]')).map(node => node.textContent))
      .toEqual(expect.arrayContaining(['Bonjour', 'Au revoir']))
    expect(predicateHeader).toHaveAttribute('rowspan', '2')
    expect(value?.getAttribute('headers')).toBe(predicateHeader?.id)
  })

  it('renders named nodes, collections, and nested blank nodes semantically', () => {
    const store = graph()
    const subject = namedNode('https://pod.example/item')
    const related = namedNode('https://pod.example/related')
    const nested = store.bnode('nested')
    store.add(subject, namedNode('https://pod.example/links'), related)
    store.add(subject, namedNode('https://pod.example/details'), nested)
    store.add(subject, namedNode('https://pod.example/otherDetails'), nested)
    store.add(nested, namedNode('https://pod.example/label'), literal('Nested'))
    const collection = new Collection()
    collection.append(related)
    collection.append(literal('Second'))
    store.add(subject, namedNode('https://pod.example/list'), collection)

    const table = dataContentPane.statementsAsTables(
      store.statementsMatching(subject),
      context(store)
    )

    expect(table.querySelector(`a[href="${related.uri}"]`)).toBeTruthy()
    expect(table.querySelector('ol > li')).toBeTruthy()
    expect(table.querySelector('table[aria-label="Properties"]')).toBeTruthy()
    expect(table.querySelector('.bnodeDef[tabindex="-1"]')).toBeTruthy()
  })

  it('preserves sanitized XMLLiteral content and labels its embedded region', () => {
    const store = graph()
    const subject = namedNode('https://pod.example/item')
    const xmlLiteral = literal(
      '<p>Safe</p><img src="diagram.png" alt="Diagram"><script>window.bad = true</script>',
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral')
    )
    store.add(subject, namedNode('https://pod.example/content'), xmlLiteral)

    const table = dataContentPane.statementsAsTables(
      store.statementsMatching(subject),
      context(store)
    )
    const embedded = table.querySelector('[role="group"]')

    expect(embedded).toHaveAttribute('aria-label', 'Embedded HTML content')
    expect(embedded).toHaveTextContent('Safe')
    expect(embedded?.querySelector('img')).toHaveAttribute('alt', 'Diagram')
    expect(embedded?.querySelector('script')).toBeNull()
  })

  it('keeps links usable when no outline manager is available', () => {
    const store = graph()
    const subject = namedNode('https://pod.example/item')
    const target = namedNode('https://pod.example/target')
    store.add(subject, namedNode('https://pod.example/related'), target)
    const table = dataContentPane.statementsAsTables(
      store.statementsMatching(subject),
      context(store)
    )
    const link = table.querySelector(`a[href="${target.uri}"]`) as HTMLAnchorElement
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })

    link.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('leaves modified clicks to native browser navigation', () => {
    const store = graph()
    const subject = namedNode('https://pod.example/item')
    const target = namedNode('https://pod.example/target')
    store.add(subject, namedNode('https://pod.example/related'), target)
    const table = dataContentPane.statementsAsTables(
      store.statementsMatching(subject),
      context(store)
    )
    const link = table.querySelector(`a[href="${target.uri}"]`) as HTMLAnchorElement
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true
    })

    link.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
