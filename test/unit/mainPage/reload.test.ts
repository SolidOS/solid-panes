import { afterEach, describe, expect, it, vi } from 'vitest'
import { authn, authSession, store } from 'solid-logic'
import { lit, sym } from 'rdflib'
import { ns } from 'solid-ui'

const { getViewerModeMock, byName } = vi.hoisted(() => ({
  getViewerModeMock: vi.fn(),
  byName: (name: string) => ({
    name,
    icon: '',
    label: () => name,
    render: (subject: { value: string }) => {
      const div = document.createElement('div')
      div.textContent = `${name} pane for ${subject.value}`
      return div
    }
  })
}))

vi.mock('pane-registry', () => ({ byName }))

vi.mock('../../../src/components/profile-heading/profileHeadingData', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/components/profile-heading/profileHeadingData')>(),
  getViewerMode: getViewerModeMock
}))
vi.mock('../../../src/utils/webIdUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/utils/webIdUtils')>(),
  loadProfileFromURI: async (subject: ReturnType<typeof sym>) => subject
}))
vi.mock('../../../src/utils/podUtils', () => ({
  getPodStorages: async () => [],
  isInViewerPod: async () => false,
  loadContainerRepresentation: async () => undefined
}))
vi.mock('../../../src/mainPage/header', () => ({ createHeader: vi.fn() }))
vi.mock('../../../src/index', async () => {
  const { default: OutlineManager } = await import('../../../src/outline/manager')
  const paneRegistry = { list: [], byName }
  return {
    getOutliner: () => new OutlineManager({ dom: document, session: { store, paneRegistry } })
  }
})

import { initMainPage } from '../../../src/mainPage'

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

describe('page reload of a WebID', () => {
  it.each([
    ['after using the account menu', (webId: string) => ({
      paneName: 'folder',
      paneUri: `${window.location.origin}/storage/`,
      viaAccountMenu: true
    })],
    ['after selecting Friends in the navbar', (webId: string) => ({ paneName: 'social', paneUri: webId })]
  ])('shows the profile with the profile selected in the navbar and its heading %s', async (_name, savedState) => {
    const viewer = sym(`${window.location.origin}/profile/card#me`)
    const other = sym(`${window.location.origin}/other/profile/card#me`)
    store.add(other, ns.vcard('fn'), lit('Someone Else'), other.doc())
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(viewer)
    vi.spyOn(authSession.events, 'on').mockReturnValue(authSession.events)
    getViewerModeMock.mockResolvedValue('visitor')
    window.history.replaceState(savedState(other.value), '', other.value)

    await initMainPage(store)
    const mount = document.getElementById('profile-heading-mount')!
    await vi.waitFor(() => expect(mount.querySelector('solid-panes-profile-heading')).not.toBeNull())
    const heading = mount.querySelector('solid-panes-profile-heading') as HTMLElement & {
      profileData?: { name: string }
    }
    const navbar = document.querySelector('solid-panes-navbar') as HTMLElement & {
      navbarItems: Array<{ paneName?: string, selected?: boolean }>
    }

    expect(window.location.href).toBe(other.value)
    expect(window.history.state).toMatchObject({ paneName: 'profile', paneUri: other.value })
    expect(window.history.state).not.toHaveProperty('viaAccountMenu')
    expect(mount.hidden).toBe(false)
    expect(heading.profileData?.name).toBe('Someone Else')
    expect(navbar).not.toHaveClass('navbar--hidden')
    expect(navbar.navbarItems.filter(item => item.selected).map(item => item.paneName)).toEqual(['profile'])
  })
})
