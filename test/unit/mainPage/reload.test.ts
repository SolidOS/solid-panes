import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authn, authSession, store } from 'solid-logic'
import { lit, sym } from 'rdflib'
import { ns } from 'solid-ui'

const { getViewerModeMock, loadProfile, outlinerHolder, byName } = vi.hoisted(() => ({
  getViewerModeMock: vi.fn(),
  loadProfile: vi.fn(),
  outlinerHolder: { current: undefined as undefined | { GotoSubject: (...args: unknown[]) => void } },
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
  loadProfileFromURI: loadProfile
}))
vi.mock('../../../src/utils/podUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/utils/podUtils')>(),
  getPodStorages: async () => [],
  loadContainerRepresentation: async () => undefined
}))
vi.mock('../../../src/mainPage/header', () => ({ createHeader: vi.fn() }))
vi.mock('../../../src/index', async () => {
  const { default: OutlineManager } = await import('../../../src/outline/manager')
  const paneRegistry = { list: [], byName }
  return {
    getOutliner: () => {
      const outliner = new OutlineManager({ dom: document, session: { store, paneRegistry } })
      outlinerHolder.current = outliner
      return outliner
    }
  }
})

import { initMainPage } from '../../../src/mainPage'
import { resetPodContexts } from '../../../src/navigation/podContext'

// Without a profile of its own, the lookup answers with the URL it was asked about
const noProfile = async (subject: ReturnType<typeof sym>) => subject

beforeEach(() => {
  loadProfile.mockImplementation(noProfile)
})

afterEach(() => {
  vi.restoreAllMocks()
  resetPodContexts()
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
    vi.spyOn(authSession.events, 'on').mockImplementation(() => {})
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

    expect(mount.nextElementSibling).toBe(navbar)
    expect(window.location.href).toBe(other.value)
    expect(window.history.state).toMatchObject({ paneName: 'profile', paneUri: other.value })
    expect(window.history.state).not.toHaveProperty('viaAccountMenu')
    expect(mount.hidden).toBe(false)
    expect(heading.profileData?.name).toBe('Someone Else')
    expect(navbar).not.toHaveClass('navbar--hidden')
    expect(navbar.navbarItems.filter(item => item.selected).map(item => item.paneName)).toEqual(['profile'])
  })
})

describe('page reload of the document that holds a WebID', () => {
  it('shows the document and its content like any other resource, not the profile', async () => {
    const viewer = sym(`${window.location.origin}/profile/card#me`)
    const webId = sym(`${window.location.origin}/other/profile/card#me`)
    loadProfile.mockResolvedValue(webId)
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(viewer)
    vi.spyOn(authSession.events, 'on').mockImplementation(() => {})
    window.history.replaceState({ paneName: 'social', paneUri: webId.value }, '', webId.doc().uri)

    await initMainPage(store)
    const provider = await vi.waitFor(() => {
      const element = document.querySelector<HTMLElement & { subjectUri: string, pane?: { name: string } }>('solid-ui-file-explorer-provider')
      expect(element).not.toBeNull()
      return element!
    })
    const navbar = document.querySelector('solid-panes-navbar') as HTMLElement & {
      navbarItems: Array<{ paneName?: string, selected?: boolean }>
    }

    const mount = document.getElementById('profile-heading-mount')!
    await vi.waitFor(() => expect(mount.querySelector('solid-panes-profile-heading')).not.toBeNull())
    expect(mount.hidden).toBe(false)
    expect(navbar).not.toHaveClass('navbar--hidden')
    expect(window.location.href).toBe(webId.doc().uri)
    expect(provider.subjectUri).toBe(webId.doc().uri)
    expect(provider.querySelector('solid-ui-file-explorer-header')).not.toBeNull()
    expect(provider.pane?.name).not.toBe('profile')
    expect(window.history.state?.paneName).toBeUndefined()
    expect(navbar.navbarItems.filter(item => item.selected)).toEqual([])
  })

  it('leaves other pages of the pod showing what they show', async () => {
    const viewer = sym(`${window.location.origin}/profile/card#me`)
    loadProfile.mockResolvedValue(sym(`${window.location.origin}/other/profile/card#me`))
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(viewer)
    vi.spyOn(authSession.events, 'on').mockImplementation(() => {})
    window.history.replaceState({}, '', '/other/docs/')

    await initMainPage(store)
    const navbar = document.querySelector('solid-panes-navbar') as HTMLElement & {
      navbarItems: Array<{ selected?: boolean }>
    }

    expect(window.history.state?.paneName).toBeUndefined()
    expect(navbar.navbarItems.filter(item => item.selected)).toEqual([])
  })

  it.each([
    ['a container', '/other/docs/'],
    ['a resource', '/other/docs/notes.ttl']
  ])('shows %s with its file explorer header, even after a storage was selected', async (_name, url) => {
    const viewer = sym(`${window.location.origin}/profile/card#me`)
    loadProfile.mockResolvedValue(sym(`${window.location.origin}/other/profile/card#me`))
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(viewer)
    vi.spyOn(authSession.events, 'on').mockImplementation(() => {})
    window.history.replaceState({ paneName: 'folder', paneUri: `${window.location.origin}/other/` }, '', url)

    await initMainPage(store)
    const provider = await vi.waitFor(() => {
      const element = document.querySelector<HTMLElement & { subjectUri: string }>('solid-ui-file-explorer-provider')
      expect(element).not.toBeNull()
      return element!
    })

    expect(provider.subjectUri).toBe(`${window.location.origin}${url}`)
    expect(provider.querySelector('solid-ui-file-explorer-header')).not.toBeNull()
    expect(window.history.state?.paneName).toBeUndefined()
    expect(window.location.pathname).toBe(url)
  })
})

describe('a link into another pod, made by a package that does not use the controller', () => {
  const ownerOf = (pod: string) => sym(`${window.location.origin}/${pod}/profile/card#me`)

  it('brings the heading and the navbar along to the other pod', async () => {
    const viewer = sym(`${window.location.origin}/profile/card#me`)
    store.add(ownerOf('a'), ns.vcard('fn'), lit('Owner A'), ownerOf('a').doc())
    store.add(ownerOf('b'), ns.vcard('fn'), lit('Owner B'), ownerOf('b').doc())
    loadProfile.mockImplementation(async (subject: ReturnType<typeof sym>) => {
      const [pod] = new URL(subject.uri).pathname.split('/').filter(Boolean)
      return ownerOf(pod)
    })
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(viewer)
    vi.spyOn(authSession.events, 'on').mockImplementation(() => {})
    getViewerModeMock.mockResolvedValue('visitor')
    window.history.replaceState({}, '', ownerOf('a').uri)

    await initMainPage(store)
    const mount = document.getElementById('profile-heading-mount')!
    const navbar = document.querySelector('solid-panes-navbar') as HTMLElement & { navbarItems: Array<{ paneUri?: string }> }
    const heading = () => mount.querySelector('solid-panes-profile-heading') as HTMLElement & { profileData?: { name: string }, compact?: boolean }
    await vi.waitFor(() => expect(heading()?.profileData?.name).toBe('Owner A'))
    expect(navbar.navbarItems.map(item => item.paneUri)).toEqual([ownerOf('a').value, ownerOf('a').value])

    // As the links and buttons in solid-ui do
    outlinerHolder.current!.GotoSubject(store.sym(`${window.location.origin}/b/docs/`), true, undefined, true)

    await vi.waitFor(() => expect(heading()?.profileData?.name).toBe('Owner B'))
    expect(heading().compact).toBe(true)
    await vi.waitFor(() => {
      expect(navbar.navbarItems.map(item => item.paneUri)).toEqual([ownerOf('b').value, ownerOf('b').value])
    })
    expect(window.location.pathname).toBe('/b/docs/')
  })

  it('takes the navbar back to the first pod when going back', async () => {
    const viewer = sym(`${window.location.origin}/profile/card#me`)
    store.add(ownerOf('a'), ns.vcard('fn'), lit('Owner A'), ownerOf('a').doc())
    store.add(ownerOf('b'), ns.vcard('fn'), lit('Owner B'), ownerOf('b').doc())
    loadProfile.mockImplementation(async (subject: ReturnType<typeof sym>) => {
      const [pod] = new URL(subject.uri).pathname.split('/').filter(Boolean)
      return ownerOf(pod)
    })
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(viewer)
    vi.spyOn(authSession.events, 'on').mockImplementation(() => {})
    getViewerModeMock.mockResolvedValue('visitor')
    window.history.replaceState({}, '', `${window.location.origin}/a/`)

    await initMainPage(store)
    const navbar = document.querySelector('solid-panes-navbar') as HTMLElement & { navbarItems: Array<{ paneUri?: string }> }
    const owners = () => navbar.navbarItems.map(item => item.paneUri)
    await vi.waitFor(() => expect(owners()).toEqual([ownerOf('a').value, ownerOf('a').value]))

    outlinerHolder.current!.GotoSubject(store.sym(`${window.location.origin}/b/docs/`), true, undefined, true)
    await vi.waitFor(() => expect(owners()).toEqual([ownerOf('b').value, ownerOf('b').value]))

    window.history.back()
    await vi.waitFor(() => expect(window.location.pathname).toBe('/a/'))
    await vi.waitFor(() => expect(owners()).toEqual([ownerOf('a').value, ownerOf('a').value]))
  })
})
