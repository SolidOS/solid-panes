/* eslint-env jest */
import vocab from 'solid-namespace'
import { view } from './view'
import { DataFactory, graph, IndexedFormula, NamedNode, sym } from "rdflib"

const { lit } = DataFactory
const ns = vocab($rdf)

function addMockPad (mockStore: IndexedFormula): NamedNode {
  const mockPad = sym('https://mock-pad')
  const mockFirstLine = sym('https://arbitrary-line-1')
  mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc())
  mockStore.add(mockFirstLine, ns.sioc('content'), lit('First line'), mockPad.doc())
  mockStore.add(mockFirstLine, ns.dc('created'), lit(new Date(0).toString()), mockPad.doc())
  const mockSecondLine = sym('https://arbitrary-line-2')
  mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc())
  mockStore.add(mockSecondLine, ns.sioc('content'), lit('Second line'), mockPad.doc())
  mockStore.add(mockSecondLine, ns.dc('created'), lit(new Date(0).toString()), mockPad.doc())
  mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc())

  return mockPad
}

describe('View mode', () => {
  it('should not show an edit button when the user is not logged in', async () => {
    const mockStore = graph()
    const mockPad = addMockPad(mockStore)

    const container = document.createElement('div')

    view({
      container: container,
      subject: mockPad,
      store: mockStore,
      visitNode: jest.fn()
    })
    const button = container.querySelector('button')
    expect(button).toBeNull()
  })

  it('should show an edit button when the user is logged in', async () => {
    const mockStore = graph()
    const mockPad = addMockPad(mockStore)
    const mockUser = sym('https://mock-user')

    const container = document.createElement('div')

    view({
      container: container,
      subject: mockPad,
      store: mockStore,
      user: mockUser,
      visitNode: jest.fn()
    })
    const button = container.querySelector('button')
    expect(button).toBeDefined()
    expect(button!.textContent).toBe('Edit')
  })

  it('should properly render the pad\'s contents', async () => {
    const mockStore = graph()
    const mockPad = addMockPad(mockStore)

    const container = document.createElement('div')

    view({
      container: container,
      subject: mockPad,
      store: mockStore,
      visitNode: jest.fn()
    })
    expect(container.outerHTML).toMatchSnapshot()
  })
})

describe('Edit mode', () => {
  it('should switch to edit mode when clicking the edit button', async () => {
    const mockStore = graph()
    const mockPad = addMockPad(mockStore)
    const mockUser = sym('https://mock-user')

    const container = document.createElement('div')

    view({
      container: container,
      subject: mockPad,
      store: mockStore,
      visitNode: jest.fn(),
      user: mockUser
    })
    const button = container.querySelector('button')
    button!.dispatchEvent(new Event('click'))

    const textarea = container.querySelector('textarea')
    expect(textarea).toBeDefined()
  })
})
