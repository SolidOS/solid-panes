/* eslint-env jest */
import OutlineManager from './manager'

import { lit, NamedNode, sym, blankNode } from 'rdflib'
import { findByText, getByText } from '@testing-library/dom'

const MockPane = {
  render: (subject: NamedNode) => {
    const div = document.createElement('div')
    div.appendChild(document.createTextNode(`Mock Pane for ${subject.uri}`))
    return div
  }
}

const mockPaneRegistry = {
  list: [],
  byName: () => MockPane
}

describe('manager', () => {
  describe('outline object td', () => {
    describe('for a named node', () => {
      let result
      beforeAll(() => {
        const table = document.createElement('table')
        const row = document.createElement('tr')
        table.appendChild(row)
        const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
        result = manager.outlineObjectTD(sym('https://namednode.example/'), null, null, null)
        row.appendChild(result)
      })
      it('is a html td element', () => {
        expect(result.nodeName).toBe('TD')
      })
      it('about attribute refers to node', () => {
        expect(result).toHaveAttribute('about', '<https://namednode.example/>')
      })
      it('has class obj', () => {
        expect(result).toHaveClass('obj')
      })
      it('is selectable', () => {
        expect(result).toHaveAttribute('notselectable', 'false')
      })
      it('has style', () => {
        expect(result).toHaveStyle('margin: 0.2em; border: none; padding: 0; vertical-align: top;')
      })
      it('shows an expand icon', () => {
        const img = result.firstChild
        expect(img.nodeName).toBe('IMG')
        expect(img).toHaveAttribute('src', 'https://solid.github.io/solid-ui/src/originalIcons/tbl-expand-trans.png')
      })
      it('shows the node label', () => {
        expect(result).toHaveTextContent('namednode.example')
      })
      it('label is draggable', () => {
        const label = getByText(result, 'namednode.example')
        expect(label).toHaveAttribute('draggable', 'true')
      })
      describe('link icon', () => {
        let linkIcon
        beforeEach(() => {
          const label = getByText(result, 'namednode.example')
          linkIcon = label.lastChild
        })
        it('is linked to named node URI', () => {
          expect(linkIcon.nodeName).toBe('A')
          expect(linkIcon).toHaveAttribute('href', 'https://namednode.example/')
        })
      })
      describe('expanding', () => {
        it('renders relevant pane', async () => {
          const expand = result.firstChild
          expand.click()
          const error = await findByText(result.parentNode, /Mock Pane/)
          expect(error).toHaveTextContent('Mock Pane for https://namednode.example/')
        })
      })
    })

    describe('for a tel uri', () => {
      let result
      beforeAll(() => {
        const manager = new OutlineManager({ dom: document })
        result = manager.outlineObjectTD(sym('tel:+1-201-555-0123'), null, null, null)
      })
      it('is a html td element', () => {
        expect(result.nodeName).toBe('TD')
      })
      it('about attribute refers to tel uri', () => {
        expect(result).toHaveAttribute('about', '<tel:+1-201-555-0123>')
      })
      it('has class obj', () => {
        expect(result).toHaveClass('obj')
      })
      it('is selectable', () => {
        expect(result).toHaveAttribute('notselectable', 'false')
      })
      it('has style', () => {
        expect(result).toHaveStyle('margin: 0.2em; border: none; padding: 0; vertical-align: top;')
      })
      it('shows an expand icon', () => {
        const img = result.firstChild
        expect(img.nodeName).toBe('IMG')
        expect(img).toHaveAttribute('src', 'https://solid.github.io/solid-ui/src/originalIcons/tbl-expand-trans.png')
      })
      it('shows the phone number', () => {
        expect(result).toHaveTextContent('+1-201-555-0123')
      })
      describe('phone link', () => {
        let phoneLink
        beforeAll(() => {
          const label = getByText(result, '+1-201-555-0123')
          phoneLink = label.lastChild
        })
        it('is linked to tel uri', () => {
          expect(phoneLink.nodeName).toBe('A')
          expect(phoneLink).toHaveAttribute('href', 'tel:+1-201-555-0123')
        })
        it('is represented by phone icon', () => {
          const phoneIcon = phoneLink.lastChild
          expect(phoneIcon.nodeName).toBe('IMG')
          expect(phoneIcon).toHaveAttribute('src', 'https://solid.github.io/solid-ui/src/originalIcons/silk/telephone.png')
        })
      })
    })

    describe('for a literal', () => {
      let result
      beforeAll(() => {
        const manager = new OutlineManager({ dom: document })
        result = manager.outlineObjectTD(lit('some text'), null, null, null)
      })
      it('is a html td element', () => {
        expect(result.nodeName).toBe('TD')
      })
      it('has no about attribute', () => {
        expect(result).not.toHaveAttribute('about')
      })
      it('has class obj', () => {
        expect(result).toHaveClass('obj')
      })
      it('is selectable', () => {
        expect(result).toHaveAttribute('notselectable', 'false')
      })
      it('has style', () => {
        expect(result).toHaveStyle('margin: 0.2em; border: none; padding: 0; vertical-align: top;')
      })
      it('shows the literal text', () => {
        expect(result).toHaveTextContent('some text')
      })
      it('literal text preserves white space', () => {
        const text = getByText(result, 'some text')
        expect(text).toHaveStyle('white-space: pre-wrap;')
      })
    })

    describe('for a blank node', () => {
      let result
      beforeAll(() => {
        const manager = new OutlineManager({ dom: document })
        result = manager.outlineObjectTD(blankNode('blank-node'), null, null, null)
      })
      it('is a html td element', () => {
        expect(result.nodeName).toBe('TD')
      })
      it('has about attribute', () => {
        expect(result).toHaveAttribute('about', '_:blank-node')
      })
      it('has class obj', () => {
        expect(result).toHaveClass('obj')
      })
      it('is selectable', () => {
        expect(result).toHaveAttribute('notselectable', 'false')
      })
      it('has style', () => {
        expect(result).toHaveStyle('margin: 0.2em; border: none; padding: 0; vertical-align: top;')
      })
      it('shows 3 dots', () => {
        expect(result).toHaveTextContent('...')
      })
    })
  })
})
