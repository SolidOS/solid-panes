import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { authn, store } from 'solid-logic'
import type { PaneDefinition } from 'pane-registry'
import * as paneRegistry from 'pane-registry'
import type FileExplorerHeader from 'solid-ui/components/file-explorer-header'

const { isInViewerPodMock } = vi.hoisted(() => ({ isInViewerPodMock: vi.fn() }))

vi.mock('../../../src/navigation/podContext', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/navigation/podContext')>(),
  isPageInViewerPod: isInViewerPodMock
}))

vi.mock('solid-ui', async () => {
  const actual = await vi.importActual<typeof import('solid-ui')>('solid-ui')
  return {
    ...actual,
    getRelevantPanes: async (_subject, context) => context.session.paneRegistry.list,
    login: {
      ...actual.login,
      filterAvailablePanes: async panes => panes
    }
  }
})

vi.mock('pane-registry', () => ({
  byName: vi.fn()
}))

import OutlineManager from '../../../src/outline/manager'
import { onNavigated, type NavigatedDetail } from '../../../src/navigation/events'
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
    beforeEach(() => {
      isInViewerPodMock.mockReset().mockResolvedValue(false)
    })

    afterEach(() => {
      vi.restoreAllMocks()
      document.body.replaceChildren()
    })

    it.each([
      ['https://owner.example/profile/card#me', true],
      ['https://owner.example/profile/card', true],
      ['https://owner.example/storage/file.ttl', false],
      ['https://visitor.example/profile/card#me', false]
    ])('sets navbar visibility for %s', async (uri, hidden) => {
      vi.spyOn(authn, 'currentUser').mockReturnValue(sym('https://owner.example/profile/card#me'))
      const navbar = document.createElement('solid-panes-navbar')
      navbar.classList.toggle('navbar--hidden', !hidden)
      document.body.appendChild(navbar)
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })

      manager.GotoSubject(sym(uri), false)

      await vi.waitFor(() => expect(navbar.classList.contains('navbar--hidden')).toBe(hidden))
    })

    it('keeps the navbar hidden when a storage link navigates to an owned resource', async () => {
      vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/profile/card#me`))
      isInViewerPodMock.mockResolvedValue(true)
      const navbar = document.createElement('solid-panes-navbar')
      document.body.appendChild(navbar)
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const uri = `${window.location.origin}/storage/file.ttl`

      manager.GotoSubject(sym(uri), false, undefined, true)

      expect(window.location.href).toBe(uri)
      await vi.waitFor(() => expect(navbar).toHaveClass('navbar--hidden'))
      expect(isInViewerPodMock).toHaveBeenCalledWith(uri)
      window.history.replaceState({}, '', '/')
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

    it.each([
      ['the options form', { source: 'accountMenu' }, true],
      ['the old boolean form', false, true],
      ['default options', {}, false],
      ['the old default', true, false],
      ['no options', undefined, false]
    ])('marks the entry as opened by the account menu with %s: %s', (_name, options, marked) => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const pane = { ...MockPane, subject: sym(`${window.location.origin}/profile/card#me`) }
      window.history.replaceState({ viaAccountMenu: !marked }, '', '/')

      manager.GotoSubject(sym(window.location.href), false, pane, true, undefined, undefined, options as never)

      expect(Boolean(window.history.state.viaAccountMenu)).toBe(marked)
    })

    describe('announcing the navigation', () => {
      it('announces once after a solo display, with the entry it wrote', () => {
        const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
        const pane = { ...MockPane, subject: sym(`${window.location.origin}/profile/card#me`) }
        const seen: NavigatedDetail[] = []
        const stop = onNavigated(detail => seen.push(detail))

        manager.GotoSubject(sym(window.location.href), false, pane, true, undefined, undefined, { source: 'accountMenu' })
        stop()

        expect(seen).toEqual([{
          url: window.location.href,
          state: {
            view: { kind: 'pane', pane: 'mock', subject: `${window.location.origin}/profile/card#me` },
            viaAccountMenu: true
          }
        }])
      })

      it('announces the new URL when a different subject is displayed', () => {
        const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
        const target = sym(`${window.location.origin}/elsewhere/`)
        const listener = vi.fn()
        const stop = onNavigated(listener)

        manager.GotoSubject(target, false, undefined, true)
        stop()

        expect(listener).toHaveBeenCalledWith({
          url: target.uri,
          state: { view: { kind: 'default' }, viaAccountMenu: false }
        })
      })

      it('does not announce displays inside the page that do not change what is shown as a whole', () => {
        const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
        const listener = vi.fn()
        const stop = onNavigated(listener)

        manager.GotoSubject(sym(window.location.href), false, MockPane, false, undefined, document.createElement('table'))
        stop()

        expect(listener).not.toHaveBeenCalled()
      })
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

      expect(table.querySelector('.obj')).toHaveAttribute('about', `<${profile.uri}>`)
      expect(window.location.href).toBe(container.uri)
      expect(window.history.state).toMatchObject({ paneName: 'mock', paneUri: profile.uri, viaAccountMenu: true })
    })

    it('updates navigation state while preserving the current URL', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const shellUrl = `${window.location.origin}/browse.html?uri=${encodeURIComponent(`${window.location.origin}/other/`)}`
      const subject = sym(`${window.location.origin}/other/`)
      const pane = { ...MockPane, subject }
      window.history.replaceState({ existing: true }, '', shellUrl)

      const seen: NavigatedDetail[] = []
      const stop = onNavigated(detail => seen.push(detail))
      manager.GotoSubject(subject, false, pane, true, undefined, undefined, {
        folderView: 'explorer',
        preserveUrl: true
      })
      stop()

      expect(window.location.href).toBe(shellUrl)
      expect(window.history.state).toMatchObject({
        existing: true,
        paneName: 'mock',
        paneUri: subject.uri
      })
      expect(seen.at(-1)).toMatchObject({
        url: shellUrl,
        state: {
          view: { kind: 'pane', pane: 'mock', subject: subject.uri },
          viaAccountMenu: false
        }
      })
    })

    it('displays a navbar pane\'s own subject, and the page subject for panes without one', () => {
      const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
      const page = sym(`${window.location.origin}/other/container/sub/`)
      const storage = sym(`${window.location.origin}/other/`)
      window.history.replaceState({}, '', page.uri)

      const navbarTable = document.createElement('table')
      manager.GotoSubject(page, false, { ...MockPane, subject: storage }, true, undefined, navbarTable)
      expect(navbarTable.querySelector('.obj')).toHaveAttribute('about', `<${storage.uri}>`)
      expect(window.location.href).toBe(page.uri)
      expect(window.history.state).toMatchObject({ paneName: 'mock', paneUri: storage.uri })

      const homeTable = document.createElement('table')
      manager.GotoSubject(page, false, MockPane, true, undefined, homeTable, false)
      expect(homeTable.querySelector('.obj')).toHaveAttribute('about', `<${page.uri}>`)
    })

    describe('hosting storage independently of the page URL', () => {
      const root = `${window.location.origin}/other/`

      function setup () {
        const folderPane = {
          name: 'folder',
          icon: '',
          label: () => 'Contents',
          render: (subject: { uri: string }) => {
            const div = document.createElement('div')
            div.textContent = `Storage shell for ${subject.uri}`
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

      async function opened (target: string) {
        const { manager, folderPane } = setup()
        window.history.replaceState({}, '', target)
        const table = document.createElement('table')
        document.body.appendChild(table)
        manager.GotoSubject(sym(target), true, { ...folderPane, subject: sym(root) }, true, undefined, table)
        await vi.waitFor(() => expect(table).toHaveTextContent(`Storage shell for ${root}`))
        return table
      }

      it.each([
        `${root}a/b/`,
        `${root}a/b/file.ttl`,
        root,
        `${window.location.origin}/elsewhere/a/`
      ])('renders the storage subject while preserving page URL %s', async target => {
        const table = await opened(target)
        const provider = table.querySelector<HTMLElement & { subjectUri: string }>('solid-ui-file-explorer-provider')
        expect(provider?.subjectUri).toBe(root)
        expect(provider?.querySelector(':scope > .paneDiv')).toHaveTextContent(`Storage shell for ${root}`)
        expect(window.location.href).toBe(target)
        expect(window.history.state).toMatchObject({ paneName: 'folder', paneUri: root })
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
        const element = table.querySelector<HTMLElement & { subjectUri: string }>('solid-ui-file-explorer-provider')
        expect(element).not.toBeNull()
        return element!
      })

      expect(provider.subjectUri).toBe(profile.uri)
      expect(provider.querySelector('solid-ui-file-explorer-header')).toBeNull()
      expect(table).toHaveTextContent(`Mock Pane for ${profile.uri}`)
      expect(window.location.href).toBe(container.uri)
    })

    describe('file explorer header', () => {
      const container = sym(`${window.location.origin}/other/folder/file.ttl`)

      const findPane = vi.fn()

      function createExplorer (
        pane: Omit<PaneDefinition, 'icon'> & { icon: string | (() => string | Promise<string>) } = MockPane,
        options = {},
        subject = container
      ) {
        const manager = new OutlineManager({ dom: document, session: { paneRegistry: { list: [pane], byName: findPane }, store } })
        const outlineView = document.createElement('div')
        outlineView.id = 'OutlineView'
        document.body.appendChild(outlineView)
        const provider = manager.propertyTable(subject, undefined, pane, options)
        outlineView.appendChild(provider)
        return provider
      }

      beforeEach(() => {
        isInViewerPodMock.mockReset()
        findPane.mockReset()
      })

      it.each([
        `${window.location.origin}/`,
        `${window.location.origin}/profile/card#me`
      ])('does not add a resource header for %s', async uri => {
        const provider = createExplorer(MockPane, {}, sym(uri))
        await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())
        expect(provider.querySelector('solid-ui-file-explorer-header')).toBeNull()
        expect(isInViewerPodMock).not.toHaveBeenCalled()
      })

      it('renders pane and header before menu icons resolve', async () => {
        let resolveIcon!: (icon: string) => void
        const icon = new Promise<string>(resolve => { resolveIcon = resolve })
        const provider = createExplorer({ ...MockPane, icon: () => icon })
        await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())
        const header = provider.querySelector<FileExplorerHeader>('solid-ui-file-explorer-header')!
        expect(header).not.toBeNull()
        expect(header.menuItems).toEqual([])

        resolveIcon(MockPane.icon)
        await vi.waitFor(() => expect(header.menuItems).toHaveLength(1))
      })

      it('does not add a resource header for index.ttl#this', async () => {
        const provider = createExplorer(MockPane, { solo: true }, sym(`${window.location.origin}/addressbook/index.ttl#this`))
        await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())
        expect(provider.querySelector('solid-ui-file-explorer-header')).toBeNull()
      })

      it.each([false, true])('resolves a container index only for direct navigation (explicit pane: %s)', async explicit => {
        const subject = sym(`${window.location.origin}/indexed-container/`)
        const index = sym(`${subject.uri}index.ttl#this`)
        const contains = sym('http://www.w3.org/ns/ldp#contains')
        store.add(subject, contains, index.doc(), subject.doc())
        const load = vi.spyOn(store.fetcher, 'load').mockResolvedValue([])
        const resource = {
          containerHasIndexDocument: vi.fn(() => true),
          getContainerIndexThing: vi.fn(() => index)
        }
        const manager = new OutlineManager({
          dom: document,
          session: { store, logic: { resource }, paneRegistry: mockPaneRegistry }
        })
        try {
          const provider = manager.propertyTable(subject, undefined, explicit ? MockPane : undefined, { solo: true })
          document.body.appendChild(provider)
          await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())

          expect(provider.subjectUri).toBe(explicit ? subject.uri : index.uri)
          expect(provider.querySelector('.paneDiv')).toHaveTextContent(`Mock Pane for ${explicit ? subject.uri : index.uri}`)
          if (explicit) {
            expect(resource.getContainerIndexThing).not.toHaveBeenCalled()
          } else {
            expect(load).toHaveBeenCalledWith(index.doc())
            expect(provider.querySelector('solid-ui-file-explorer-header')).toBeNull()
          }
        } finally {
          load.mockRestore()
          store.removeMany(subject, contains, index.doc(), subject.doc())
        }
      })

      it('resolves an indexed container from its listing when the resource service is unavailable', async () => {
        const subject = sym(`${window.location.origin}/indexed-without-resource/`)
        const indexDocument = sym(`${subject.uri}index.ttl`)
        const index = sym(`${indexDocument.uri}#this`)
        const contains = sym('http://www.w3.org/ns/ldp#contains')
        store.add(subject, contains, indexDocument, subject.doc())
        const load = vi.spyOn(store.fetcher, 'load').mockResolvedValue([])
        const manager = new OutlineManager({
          dom: document,
          session: { store, paneRegistry: mockPaneRegistry }
        })
        try {
          const provider = manager.propertyTable(subject, undefined, undefined, { solo: true })
          document.body.appendChild(provider)
          await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())

          expect(provider.subjectUri).toBe(index.uri)
          expect(provider.querySelector('.paneDiv')).toHaveTextContent(`Mock Pane for ${index.uri}`)
          expect(load).toHaveBeenCalledWith(index.doc())
        } finally {
          load.mockRestore()
          store.removeMany(subject, contains, indexDocument, subject.doc())
        }
      })

      it('reports menu failures without removing the rendered pane or header', async () => {
        const error = new Error('Unable to resolve pane icon')
        const status = document.createElement('div')
        status.id = 'status'
        document.body.appendChild(status)
        const icon = vi.fn()
          .mockReturnValueOnce(MockPane.icon)
          .mockImplementationOnce(() => { throw error })
        const provider = createExplorer({
          ...MockPane,
          icon
        })
        await vi.waitFor(() => expect(status).toHaveTextContent('Unable to resolve pane icon'))
        expect(provider.querySelector('.paneDiv')).not.toBeNull()
        expect(provider.querySelector('solid-ui-file-explorer-header')).not.toBeNull()
      })

      it('reuses resource visibility and menu items when switching panes', async () => {
        isInViewerPodMock.mockResolvedValue(true)
        const provider = createExplorer(MockPane, { headerOnlyInViewerPod: true })
        await vi.waitFor(() => {
          expect(provider.querySelector<FileExplorerHeader>('solid-ui-file-explorer-header')?.menuItems).toHaveLength(1)
        })
        const header = provider.querySelector<FileExplorerHeader>('solid-ui-file-explorer-header')!
        const menuItems = header.menuItems
        findPane.mockReturnValue({ ...MockPane, name: 'profile' })
        menuItems[0].action(new Event('click'))
        expect(provider.querySelector('solid-ui-file-explorer-header')).toBeNull()

        findPane.mockReturnValue(MockPane)
        menuItems[0].action(new Event('click'))
        const restored = provider.querySelector<FileExplorerHeader>('solid-ui-file-explorer-header')!
        expect(restored.menuItems).toBe(menuItems)
        expect(isInViewerPodMock).toHaveBeenCalledTimes(1)
      })

      it('does not switch the outer pane for an unhandled nested pane-switch event', async () => {
        const provider = createExplorer()
        await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())
        const paneElement = provider.querySelector('.paneDiv')!
        const nested = document.createElement('solid-ui-file-explorer-provider')
        paneElement.appendChild(nested)
        nested.dispatchEvent(new CustomEvent('solid-ui-file-explorer-open-pane', {
          bubbles: true,
          composed: true,
          detail: { subjectUri: container.uri, paneName: 'profile' }
        }))

        expect(findPane).not.toHaveBeenCalled()
        expect(provider.querySelector(':scope > .paneDiv')).toBe(paneElement)
      })

      it('switches the originating provider when the same subject appears twice', async () => {
        const first = createExplorer()
        const second = createExplorer()
        await vi.waitFor(() => {
          expect(first.querySelector('.paneDiv')).not.toBeNull()
          expect(second.querySelector<FileExplorerHeader>('solid-ui-file-explorer-header')?.menuItems).toHaveLength(1)
        })
        const firstContent = first.querySelector('.paneDiv')
        const secondContent = second.querySelector('.paneDiv')
        findPane.mockReturnValue({ ...MockPane, name: 'other' })
        second.querySelector<FileExplorerHeader>('solid-ui-file-explorer-header')!.menuItems[0].action(new Event('click'))

        expect(first.querySelector('.paneDiv')).toBe(firstContent)
        expect(second.querySelector('.paneDiv')).not.toBe(secondContent)
        expect(second.pane.name).toBe('other')
      })

      it('uses the owning provider when opening a pane through the callback', async () => {
        const provider = createExplorer()
        await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())
        const replacement = { ...MockPane, name: 'replacement' }
        vi.mocked(paneRegistry.byName).mockReturnValue(replacement as never)
        try {
          provider.openPane(container, 'replacement')
          expect(provider.pane.name).toBe('replacement')
          expect(provider.querySelector('.paneDiv')).toHaveTextContent(`Mock Pane for ${container.uri}`)
        } finally {
          vi.mocked(paneRegistry.byName).mockReset()
        }
      })

      it('does not collapse the outer explorer for an unhandled nested Back event', async () => {
        const provider = createExplorer()
        await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())
        const nested = document.createElement('solid-ui-file-explorer-provider')
        provider.querySelector('.paneDiv')!.appendChild(nested)
        const parent = provider.parentNode
        nested.dispatchEvent(new CustomEvent('solid-ui-file-explorer-back', {
          bubbles: true,
          composed: true,
          detail: { subjectUri: container.uri }
        }))

        expect(provider.parentNode).toBe(parent)
        expect(provider.contains(nested)).toBe(true)
      })

      it('preserves the browser host when collapsing a solo explorer', async () => {
        const provider = createExplorer()
        await vi.waitFor(() => expect(provider.querySelector('.paneDiv')).not.toBeNull())
        const outlineView = document.createElement('div')
        outlineView.id = 'outline'
        const subjectBlock = document.createElement('div')
        subjectBlock.className = 'outline-subject-block'
        const sibling = document.createElement('div')
        subjectBlock.appendChild(provider)
        outlineView.append(subjectBlock, sibling)
        document.body.appendChild(outlineView)

        provider.dispatchEvent(new CustomEvent('solid-ui-file-explorer-back', {
          bubbles: true,
          composed: true,
          detail: { subjectUri: container.uri }
        }))

        expect(outlineView.parentNode).toBe(document.body)
        expect(outlineView.contains(sibling)).toBe(true)
      })

      async function headerShown (showNavbar: boolean, pane: object = MockPane) {
        const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry, store } })
        window.history.replaceState({}, '', container.uri)
        const table = document.createElement('table')
        document.body.appendChild(table)
        manager.GotoSubject(container, true, pane, true, undefined, table, showNavbar)
        const provider = await vi.waitFor(() => {
          const element = table.querySelector<HTMLElement>('solid-ui-file-explorer-provider')
          expect(element).not.toBeNull()
          return element!
        })
        return provider.querySelector('solid-ui-file-explorer-header') !== null
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
        result = manager.outlineObjectDiv(sym('https://namednode.example/'), null, null, null)
        row.appendChild(result)
      })
      it('is a html div element', () => {
        expect(result.nodeName).toBe('DIV')
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

        it('selects the first property object inside an expanded provider', () => {
          const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
          const outer = manager.outlineObjectDiv(sym('https://outer.example/'), null, null, null)
          const provider = document.createElement('solid-ui-file-explorer-provider')
          const propertyObject = manager.outlineObjectDiv(sym('https://property.example/'), null, null, null)
          provider.appendChild(propertyObject)
          outer.appendChild(provider)
          document.body.appendChild(outer)

          manager.walk('moveTo', outer)
          manager.walk('right')

          expect(manager.getSelection()).toEqual([propertyObject])
          expect(propertyObject).toHaveClass('selected')
          expect(outer).not.toHaveClass('selected')
        })

        it('restores the current selection when an expanded provider has no property rows', () => {
          const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
          const outer = manager.outlineObjectDiv(sym('https://outer.example/'), null, null, null)
          outer.appendChild(document.createElement('solid-ui-file-explorer-provider'))
          document.body.appendChild(outer)

          manager.walk('moveTo', outer)
          expect(() => manager.walk('right')).not.toThrow()

          expect(manager.getSelection()).toEqual([outer])
          expect(outer).toHaveClass('selected')
        })

        it('keeps the final statement selected when there is no next row', () => {
          const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
          const outer = manager.outlineObjectDiv(sym('https://final.example/'), null, null, null)
          document.body.appendChild(outer)

          manager.walk('moveTo', outer)
          expect(() => manager.walk('right')).not.toThrow()

          expect(manager.getSelection()).toEqual([outer])
        })

        it('walks left to the enclosing expanded object', () => {
          const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
          const outer = manager.outlineObjectDiv(sym('https://outer.example/'), null, null, null)
          const provider = document.createElement('solid-ui-file-explorer-provider')
          provider.setAttribute('about', '<https://outer.example/>')
          const propertyObject = manager.outlineObjectDiv(sym('https://property.example/'), null, null, null)
          provider.appendChild(propertyObject)
          outer.appendChild(provider)
          document.body.appendChild(outer)

          manager.walk('moveTo', propertyObject)
          manager.walk('left')

          expect(manager.getSelection()).toEqual([outer])
        })

        it('does not collapse an unexpanded object without an enclosing provider', () => {
          const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
          const object = manager.outlineObjectDiv(sym('https://property.example/'), null, null, null)
          document.body.appendChild(object)
          manager.walk('moveTo', object)
          const replace = vi.spyOn(manager, 'replaceTD')

          manager.OutlinerKeypressPanel({ keyCode: 37, target: object })

          expect(replace).not.toHaveBeenCalled()
          expect(object).toHaveTextContent('property.example')
        })

        it('refocuses the outer subject wrapper for shift-click expansion', async () => {
          const manager = new OutlineManager({ dom: document, session: { paneRegistry: mockPaneRegistry } })
          const subject = sym('https://shift-click.example/resource')
          const subjectBlock = document.createElement('div')
          subjectBlock.className = 'outline-subject-block'
          const object = manager.outlineObjectDiv(subject, null, null, null)
          subjectBlock.appendChild(object)
          document.body.appendChild(subjectBlock)

          object.firstChild.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))

          await vi.waitFor(() => expect(subjectBlock.querySelector('.paneDiv')).not.toBeNull())
          expect(subjectBlock).toHaveAttribute('about', subject.toNT())
          expect(subjectBlock.querySelector('[data-outline-node="object"]')).toBeNull()
          expect(subjectBlock.querySelector('solid-ui-file-explorer-provider')).toHaveAttribute(
            'about',
            subject.toNT()
          )
        })
      })
    })

    describe('for a tel uri', () => {
      let result
      beforeAll(() => {
        const manager = new OutlineManager({ dom: document })
        result = manager.outlineObjectDiv(sym('tel:+1-201-555-0123'), null, null, null)
      })
      it('is a html div element', () => {
        expect(result.nodeName).toBe('DIV')
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
        result = manager.outlineObjectDiv(lit('some text'), null, null, null)
      })
      it('is a html div element', () => {
        expect(result.nodeName).toBe('DIV')
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
        result = manager.outlineObjectDiv(blankNode('blank-node'), null, null, null)
      })
      it('is a html div element', () => {
        expect(result.nodeName).toBe('DIV')
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
    })

    describe('outlineObjectTD compatibility alias', () => {
      it('returns the same div-based object block', () => {
        const manager = new OutlineManager({ dom: document })
        const result = manager.outlineObjectTD(sym('https://alias.example/'), null, null, null)

        expect(result.nodeName).toBe('DIV')
        expect(result).toHaveAttribute('about', '<https://alias.example/>')
        expect(result).toHaveClass('obj')
      })
    })
  })
})
