import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { authn, store } from 'solid-logic'

const { isInViewerPodMock } = vi.hoisted(() => ({ isInViewerPodMock: vi.fn() }))

vi.mock('../../../src/utils/podUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/utils/podUtils')>(),
  isInViewerPod: isInViewerPodMock
}))

vi.mock('solid-ui', async () => {
  const actual = await vi.importActual<typeof import('solid-ui')>('solid-ui')
  return {
    ...actual,
    login: {
      ...actual.login,
      filterAvailablePanes: async panes => panes
    }
  }
})

import OutlineManager from '../../../src/outline/manager'
import { lit, NamedNode, sym, blankNode } from 'rdflib'
import { findByText, getByText } from '@testing-library/dom'

const MockPane = {
  name: 'mock',
  icon: 'data:image/svg+xml,<svg></svg>',
  label: () => 'Mock Pane',
  render: (subject: NamedNode) => {
    const div = document.createElement('div')
    div.appendChild(document.createTextNode(`Mock Pane for ${subject.uri}`))
    return div
  }
}

const mockPaneRegistry = {
  list: [MockPane],
  byName: () => MockPane
}

describe('manager', () => {
  describe('navbar visibility during navigation', () => {
    afterEach(() => {
      vi.restoreAllMocks()
      document.body.replaceChildren()
    })

    it.each([
      ['https://owner.example/profile/card#me', true],
      ['https://owner.example/profile/card', true],
      ['https://owner.example/storage/file.ttl', false],
      ['https://visitor.example/profile/card#me', false]
    ])('sets navbar visibility for %s', (uri, hidden) => {
      vi.spyOn(authn, 'currentUser').mockReturnValue(sym('https://owner.example/profile/card#me'))
      const navbar = document.createElement('solid-panes-navbar')
      navbar.classList.toggle('navbar--hidden', !hidden)
      document.body.appendChild(navbar)
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })

      manager.GotoSubject(sym(uri), false)

      expect(navbar.classList.contains('navbar--hidden')).toBe(hidden)
    })

    it('preserves account-menu hiding when automatic reveal is suppressed', () => {
      vi.spyOn(authn, 'currentUser').mockReturnValue(sym('https://owner.example/profile/card#me'))
      const navbar = document.createElement('solid-panes-navbar')
      navbar.classList.add('navbar--hidden')
      document.body.appendChild(navbar)
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })

      manager.GotoSubject(sym('https://visitor.example/profile/card#me'), false, undefined, false, undefined, undefined, false)

      expect(navbar).toHaveClass('navbar--hidden')
    })
  })

  describe('account-menu history state', () => {
    afterEach(() => {
      document.body.replaceChildren()
      window.history.replaceState({}, '', '/')
    })

    it('marks account-menu navigation and clears the mark on other navigation', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const pane = { ...MockPane, subject: sym(`${window.location.origin}/profile/card#me`) }
      const subject = sym(`${window.location.origin}/other/profile/card#me`)

      manager.GotoSubject(subject, false, pane, true, undefined, undefined, false)
      expect(window.history.state).toMatchObject({ paneName: 'mock', viaAccountMenu: true })
      expect(window.location.href).toBe(subject.uri)

      manager.GotoSubject(subject, false, pane, true)
      expect(window.history.state).toMatchObject({ paneName: 'mock' })
      expect(window.history.state).not.toHaveProperty('viaAccountMenu')
    })

    it('displays the account-menu pane\'s own subject while the URL stays on the page subject', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const container = sym(`${window.location.origin}/other/container/`)
      const profile = sym(`${window.location.origin}/profile/card#me`)
      window.history.replaceState({}, '', container.uri)
      const table = document.createElement('table')
      const pane = { ...MockPane, subject: profile }

      manager.GotoSubject(container, false, pane, true, undefined, table, false)

      expect(table.querySelector('td.obj')).toHaveAttribute('about', `<${profile.uri}>`)
      expect(window.location.href).toBe(container.uri)
      expect(window.history.state).toMatchObject({ paneName: 'mock', paneUri: profile.uri, viaAccountMenu: true })
    })

    it('displays a navbar pane\'s own subject, and the page subject for panes without one', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const page = sym(`${window.location.origin}/other/container/sub/`)
      const storage = sym(`${window.location.origin}/other/`)
      window.history.replaceState({}, '', page.uri)

      const navbarTable = document.createElement('table')
      manager.GotoSubject(page, false, { ...MockPane, subject: storage }, true, undefined, navbarTable)
      expect(navbarTable.querySelector('td.obj')).toHaveAttribute('about', `<${storage.uri}>`)
      expect(window.location.href).toBe(page.uri)
      expect(window.history.state).toMatchObject({ paneName: 'mock', paneUri: storage.uri })

      const homeTable = document.createElement('table')
      manager.GotoSubject(page, false, MockPane, true, undefined, homeTable, false)
      expect(homeTable.querySelector('td.obj')).toHaveAttribute('about', `<${page.uri}>`)
    })

    describe('opening the URL inside a storage', () => {
      const root = `${window.location.origin}/other/`

      // A folder pane that lists known children as expandable rows, like the real one
      function setup (children: Record<string, string[]>) {
        const folderPane = {
          name: 'folder',
          icon: '',
          label: () => 'Contents',
          render: (subject: { uri: string }, context: { getOutliner: (dom: Document) => OutlineManager, dom: Document }) => {
            const div = document.createElement('div')
            const rows = document.createElement('table')
            for (const child of children[subject.uri] ?? []) {
              const tr = document.createElement('tr')
              tr.appendChild(context.getOutliner(context.dom).outlineObjectTD(sym(child), undefined, undefined, undefined))
              rows.appendChild(tr)
            }
            div.appendChild(rows)
            return div
          }
        }
        const manager: OutlineManager = new OutlineManager({
          dom: document,
          getOutliner: () => manager,
          session: { paneRegistry: { list: [folderPane], byName: () => folderPane }, store }
        })
        return { manager, folderPane }
      }

      async function opened (target: string, children: Record<string, string[]>) {
        const { manager, folderPane } = setup(children)
        window.history.replaceState({}, '', target)
        const table = document.createElement('table')
        document.body.appendChild(table)
        manager.GotoSubject(sym(target), true, { ...folderPane, subject: sym(root) }, true, undefined, table)
        return table
      }

      const isExpanded = (table: HTMLElement, uri: string) =>
        table.querySelector(`td.obj[about="<${uri}>"]`)?.firstElementChild?.nodeName === 'TABLE'

      const tree = {
        [root]: [`${root}a/`, `${root}z/`],
        [`${root}a/`]: [`${root}a/b/`, `${root}a/other.ttl`],
        [`${root}a/b/`]: [`${root}a/b/file.ttl`]
      }

      it('expands each level down to a container in the URL, leaving siblings closed', async () => {
        const table = await opened(`${root}a/b/`, tree)

        await vi.waitFor(() => {
          expect(isExpanded(table, `${root}a/`)).toBe(true)
          expect(isExpanded(table, `${root}a/b/`)).toBe(true)
        })
        expect(isExpanded(table, `${root}z/`)).toBe(false)
        expect(table.querySelector(`td.obj[about="<${root}a/other.ttl>"]`)).not.toBeNull()
        expect(window.location.href).toBe(`${root}a/b/`)
      })

      it('opens the containers of a resource in the URL', async () => {
        const table = await opened(`${root}a/b/file.ttl`, tree)

        await vi.waitFor(() => {
          expect(isExpanded(table, `${root}a/`)).toBe(true)
          expect(isExpanded(table, `${root}a/b/`)).toBe(true)
        })
      })

      it('opens nothing when the URL is the storage itself or outside it', async () => {
        const atRoot = await opened(root, tree)
        await new Promise(resolve => setTimeout(resolve, 50))
        expect(isExpanded(atRoot, `${root}a/`)).toBe(false)

        const outside = await opened(`${window.location.origin}/elsewhere/a/`, tree)
        await new Promise(resolve => setTimeout(resolve, 50))
        expect(isExpanded(outside, `${root}a/`)).toBe(false)
      })
    })

    it('renders the account-menu profile for the viewer without a file explorer header, even on another person\'s container URL', async () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry, store } })
      const container = sym(`${window.location.origin}/other/container/`)
      const profile = sym(`${window.location.origin}/me/profile/card#me`)
      window.history.replaceState({}, '', container.uri)
      const table = document.createElement('table')
      document.body.appendChild(table)
      const pane = { ...MockPane, name: 'profile', paneName: 'profile', subject: profile }

      manager.GotoSubject(container, true, pane, true, undefined, table, false)
      const provider = await vi.waitFor(() => {
        const element = table.querySelector<HTMLElement & { showHeader: boolean, subjectUri: string }>('file-explorer-provider')
        expect(element).not.toBeNull()
        return element!
      })

      expect(provider.subjectUri).toBe(profile.uri)
      expect(provider.showHeader).toBe(false)
      expect(table).toHaveTextContent(`Mock Pane for ${profile.uri}`)
      expect(window.location.href).toBe(container.uri)
    })

    describe('file explorer header', () => {
      const container = sym(`${window.location.origin}/other/folder/file.ttl`)

      beforeEach(() => {
        isInViewerPodMock.mockReset()
      })
      async function headerShown (showNavbar: boolean, pane: object = MockPane) {
        const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry, store } })
        window.history.replaceState({}, '', container.uri)
        const table = document.createElement('table')
        document.body.appendChild(table)
        manager.GotoSubject(container, true, pane, true, undefined, table, showNavbar)
        const provider = await vi.waitFor(() => {
          const element = table.querySelector<HTMLElement & { showHeader: boolean }>('file-explorer-provider')
          expect(element).not.toBeNull()
          return element!
        })
        return provider.showHeader
      }

      it('is hidden for account-menu views when the URL is not in the viewer\'s pod', async () => {
        isInViewerPodMock.mockResolvedValue(false)

        expect(await headerShown(false)).toBe(false)
        expect(await headerShown(false, { ...MockPane, subject: sym(`${window.location.origin}/me/storage/docs/`) })).toBe(false)
        expect(isInViewerPodMock).toHaveBeenCalledWith(container.uri)
      })

      it('is kept for account-menu views when the URL is in the viewer\'s pod', async () => {
        isInViewerPodMock.mockResolvedValue(true)

        expect(await headerShown(false)).toBe(true)
      })

      it('is not affected for navbar navigation to a pane without its own subject', async () => {
        isInViewerPodMock.mockResolvedValue(false)

        expect(await headerShown(true)).toBe(true)
        expect(isInViewerPodMock).not.toHaveBeenCalled()
      })

      it('is hidden for navbar navigation to a pane with its own subject outside the viewer\'s pod', async () => {
        isInViewerPodMock.mockResolvedValue(false)
        const storage = { ...MockPane, subject: sym(`${window.location.origin}/other/storage/`) }

        expect(await headerShown(true, storage)).toBe(false)
        expect(isInViewerPodMock).toHaveBeenCalledWith(container.uri)
      })

      it('is kept for navbar navigation to a pane with its own subject inside the viewer\'s pod', async () => {
        isInViewerPodMock.mockResolvedValue(true)
        const storage = { ...MockPane, subject: sym(`${window.location.origin}/other/storage/`) }

        expect(await headerShown(true, storage)).toBe(true)
      })
    })

    it('does not carry pane details into the entry of a different subject', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const first = sym(`${window.location.origin}/a/profile/card#me`)
      const second = sym(`${window.location.origin}/b/profile/card#me`)
      window.history.replaceState({ other: 'kept' }, '', first.uri)
      manager.GotoSubject(first, false, { ...MockPane, subject: first }, true)
      const entries = window.history.length

      manager.GotoSubject(second, false, undefined, true)

      expect(window.history.length).toBe(entries + 1)
      expect(window.location.href).toBe(second.uri)
      expect(window.history.state).toEqual({ other: 'kept' })
    })

    it('keeps pane details when the same subject is rendered again without a pane', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const subject = sym(`${window.location.origin}/a/profile/card#me`)
      window.history.replaceState({}, '', subject.uri)
      manager.GotoSubject(subject, false, { ...MockPane, subject }, true)

      manager.GotoSubject(subject, false, undefined, true)

      expect(window.history.state).toEqual({ paneName: 'mock', paneUri: subject.uri })
    })

    it('replaces a saved pane URI when the new pane does not render another subject', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const subject = sym(`${window.location.origin}/a/profile/card#me`)
      window.history.replaceState({}, '', subject.uri)
      manager.GotoSubject(subject, false, { ...MockPane, subject: sym(`${window.location.origin}/storage/`) }, true)

      manager.GotoSubject(subject, false, { ...MockPane, name: 'other' }, true)

      expect(window.history.state).toEqual({ paneName: 'other' })
    })
  })

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
      it('uses object cell class for layout styling', () => {
        expect(result).toHaveClass('obj')
      })
      it('shows an expand icon', () => {
        const img = result.firstChild
        expect(img.nodeName).toBe('IMG')
        expect(img).toHaveAttribute('src', 'https://solidos.github.io/solid-ui/src/originalIcons/tbl-expand-trans.png')
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
      it('uses object cell class for layout styling', () => {
        expect(result).toHaveClass('obj')
      })
      it('shows an expand icon', () => {
        const img = result.firstChild
        expect(img.nodeName).toBe('IMG')
        expect(img).toHaveAttribute('src', 'https://solidos.github.io/solid-ui/src/originalIcons/tbl-expand-trans.png')
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
          expect(phoneIcon).toHaveAttribute('src', 'https://solidos.github.io/solid-ui/src/originalIcons/silk/telephone.png')
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
      it('uses object cell class for layout styling', () => {
        expect(result).toHaveClass('obj')
      })
      it('shows the literal text', () => {
        expect(result).toHaveTextContent('some text')
      })
      it('literal text uses literal styling class', () => {
        const text = getByText(result, 'some text')
        expect(text).toHaveClass('objectValue--literal')
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
      it('uses object cell class for layout styling', () => {
        expect(result).toHaveClass('obj')
      })
      it('shows 3 dots', () => {
        expect(result).toHaveTextContent('...')
      })
    })
  })
})
