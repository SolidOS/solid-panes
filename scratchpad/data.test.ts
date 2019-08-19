/* eslint-env jest */
import { getInitialisationStatements, getSetContentsStatements, getContents, isPad, getTitle, getLatestAuthor } from './data'
import vocab from 'solid-namespace'
import { graph, lit, sym } from "rdflib"
const ns = vocab($rdf)

describe('getInitialisationStatements()', () => {
  it('should properly initialise a new notepad', async () => {
    const mockStore = graph()
    mockStore.namespaces = { pub: 'https://localhost:8443/public/' }
    const [_pad, additions] = getInitialisationStatements(new Date(0), mockStore)
    expect(additions).toMatchSnapshot()
  })

  it('should include author information if available', async () => {
    const mockStore = graph()
    mockStore.namespaces = { pub: 'https://localhost:8443/public/' }
    const [_pad, additions] = getInitialisationStatements(
      new Date(0),
      mockStore,
      sym('https://user.example')
    )
    expect(additions).toMatchSnapshot()
  })
})

describe('getSetContentsStatements()', () => {
  it('should properly set a notepad\'s contents', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')
    const mockContents = `
Here's some arbitrary
multiline
content
    `
    const [deletions, additions] = getSetContentsStatements(
      mockContents,
      new Date(0),
      mockPad,
      mockStore
    )
    expect(deletions).toEqual([])
    expect(additions).toMatchSnapshot()
  })

  it('should include author information if available', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')
    const mockContents = 'Arbitrary content'
    const [deletions, additions] = getSetContentsStatements(
      mockContents,
      new Date(0),
      mockPad,
      mockStore,
      sym('https://user.example')
    )
    expect(deletions).toEqual([])
    expect(additions).toMatchSnapshot()
  })

  it('should clear previous content, if any', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')

    const mockExistingLine = sym('https://arbitrary-line.example')
    mockStore.add(mockPad, ns.pad('next'), mockExistingLine, mockPad.doc())
    mockStore.add(mockExistingLine, ns.pad('content'), (lit as any)('Existing content'), mockPad.doc())
    mockStore.add(mockExistingLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())

    const mockContents = 'Arbitrary content'
    const [deletions, _additions] = getSetContentsStatements(
      mockContents,
      new Date(0),
      mockPad,
      mockStore,
      sym('https://user.example')
    )
    expect(deletions).toMatchSnapshot()
  })
})

describe('getContents()', () => {
  it('should be able to reconstruct a multiline file', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')

    const mockFirstLine = sym('https://arbitrary-line-1.example')
    mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc())
    mockStore.add(mockFirstLine, ns.sioc('content'), (lit as any)('First line'), mockPad.doc())
    mockStore.add(mockFirstLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    const mockSecondLine = sym('https://arbitrary-line-2.example')
    mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc())
    mockStore.add(mockSecondLine, ns.sioc('content'), (lit as any)('Second line'), mockPad.doc())
    mockStore.add(mockSecondLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc())

    expect(getContents(mockStore, mockPad)).toBe(
      // eslint-disable-next-line indent
`First line
Second line`
    )
  })

  it('should ignore lines without contents', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')

    const mockFirstLine = sym('https://arbitrary-line-1.example')
    mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc())
    mockStore.add(mockFirstLine, ns.sioc('content'), (lit as any)('First line'), mockPad.doc())
    mockStore.add(mockFirstLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    const mockSecondLine = sym('https://arbitrary-line-2.example')
    mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc())
    mockStore.add(mockSecondLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc())

    expect(getContents(mockStore, mockPad)).toBe('First line')
  })
})

describe('getLatestAuthor()', () => {
  it('should be able to get the latest author', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')
    const mockEarlyAuthor = sym('https://early-author.example')
    const mockLateAuthor = sym('https://late-author.example')

    const mockFirstLine = sym('https://arbitrary-line-1.example')
    mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc())
    mockStore.add(mockFirstLine, ns.sioc('content'), (lit as any)('First line'), mockPad.doc())
    mockStore.add(mockFirstLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    mockStore.add(mockFirstLine, ns.dc('author'), mockEarlyAuthor, mockPad.doc())
    const mockSecondLine = sym('https://arbitrary-line-2.example')
    mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc())
    mockStore.add(mockSecondLine, ns.sioc('content'), (lit as any)('Second line'), mockPad.doc())
    mockStore.add(mockSecondLine, ns.dc('created'), (lit as any)(new Date(24 * 60 * 60 * 1000).toISOString()), mockPad.doc())
    mockStore.add(mockSecondLine, ns.dc('author'), mockLateAuthor, mockPad.doc())
    mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc())

    expect(getLatestAuthor(mockStore, mockPad)).toEqual(mockLateAuthor)
  })

  it('should return an author even when all lines were authored at the same time', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')
    const mockEarlyAuthor = sym('https://early-author.example')
    const mockLateAuthor = sym('https://late-author.example')

    const mockFirstLine = sym('https://arbitrary-line-1.example')
    mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc())
    mockStore.add(mockFirstLine, ns.sioc('content'), (lit as any)('First line'), mockPad.doc())
    mockStore.add(mockFirstLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    mockStore.add(mockFirstLine, ns.dc('author'), mockEarlyAuthor, mockPad.doc())
    const mockSecondLine = sym('https://arbitrary-line-2.example')
    mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc())
    mockStore.add(mockSecondLine, ns.sioc('content'), (lit as any)('Second line'), mockPad.doc())
    mockStore.add(mockSecondLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    mockStore.add(mockSecondLine, ns.dc('author'), mockLateAuthor, mockPad.doc())
    mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc())

    expect(getLatestAuthor(mockStore, mockPad)).not.toBeNull()
  })

  it('should return null if no author data is present', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')

    const mockFirstLine = sym('https://arbitrary-line-1.example')
    mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc())
    mockStore.add(mockFirstLine, ns.sioc('content'), (lit as any)('First line'), mockPad.doc())
    mockStore.add(mockFirstLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    const mockSecondLine = sym('https://arbitrary-line-2.example')
    mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc())
    mockStore.add(mockSecondLine, ns.sioc('content'), (lit as any)('Second line'), mockPad.doc())
    mockStore.add(mockSecondLine, ns.dc('created'), (lit as any)(new Date(0).toISOString()), mockPad.doc())
    mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc())

    expect(getLatestAuthor(mockStore, mockPad)).toBeNull()
  })
})

describe('getTitle()', () => {
  it('should return a document\'s title', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')

    mockStore.add(mockPad, ns.dc('title'), (lit as any)('Some title'), mockPad.doc())

    expect(getTitle(mockStore, mockPad)).toBe('Some title')
  })
})

describe('isPad()', () => {
  it('should recognise when a subject is not a Pad', async () => {
    const mockStore = graph()
    const mockNotAPad = sym('https://chat.example')
    mockStore.add(mockNotAPad, ns.rdf('type'), ns.meeting('Chat'), mockNotAPad.doc())

    expect(isPad(mockNotAPad, mockStore)).toBe(false)
  })

  it('should recognise when a subject is a Pad', async () => {
    const mockStore = graph()
    const mockPad = sym('https://pad.example')
    mockStore.add(mockPad, ns.rdf('type'), ns.pad('Notepad'), mockPad.doc())

    expect(isPad(mockPad, mockStore)).toBe(true)
  })
})
