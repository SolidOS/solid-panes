/* eslint-env jest */

import OutlineManager from './manager'

import { sym } from 'rdflib'
import { getByText } from '@testing-library/dom'

describe('manager', () => {
  describe('outline object td', () => {
    describe('for a named node', () => {
      let result
      beforeEach(() => {
        const manager = new OutlineManager({ dom: document })
        result = manager.outlineObjectTD(sym('https://namednode.example/'))
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
    })
  })
})
