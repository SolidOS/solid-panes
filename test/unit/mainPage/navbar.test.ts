import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authn } from 'solid-logic'
import { sym } from 'rdflib'
import type { NavigationController } from '../../../src/navigation/controller'
import type { NavbarMenuItem } from '../../../src/components/navbar/Navbar'
import { getFolderPanesFromURI } from '../../../src/utils/paneUtils'
import { announceNavigation } from '../../../src/navigation/events'
import { resetPodContexts } from '../../../src/navigation/podContext'
import { getPodStorages } from '../../../src/utils/podUtils'

const { loadProfile } = vi.hoisted(() => ({ loadProfile: vi.fn() }))

vi.mock('../../../src/utils/paneUtils', () => ({
  getFolderPanesFromURI: vi.fn(async () => [])
}))

vi.mock('../../../src/utils/podUtils', () => ({
  getPodStorages: vi.fn(async () => [])
}))

vi.mock('../../../src/utils/webIdUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/utils/webIdUtils')>(),
  loadProfileFromURI: loadProfile
}))

import { createNavbar, selectNavbarPane } from '../../../src/mainPage/navbar'

// Without a profile of its own, the lookup answers with the URL it was asked about
const noProfile = async (subject: ReturnType<typeof sym>) => subject

function folderPane (storage: ReturnType<typeof sym>) {
  return {
    name: 'folder',
    paneName: 'folder',
    subject: storage,
    label: () => 'Storage',
    render: vi.fn(),
    shouldGetFocus: () => false,
    requireQueryButton: false,
    icon: ''
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  resetPodContexts()
  loadProfile.mockReset().mockImplementation(noProfile)
  vi.mocked(getFolderPanesFromURI).mockResolvedValue([])
  vi.mocked(getPodStorages).mockReset().mockResolvedValue([])
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

describe('page navbar visibility', () => {
  const navigation = { show: vi.fn().mockResolvedValue(undefined) } as unknown as NavigationController

  beforeEach(() => {
    loadProfile.mockImplementation(noProfile)
  })

  it('selects a menu item by pane name and ignores unknown panes', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(null)
    window.history.replaceState({ paneName: 'social' }, '', '/other/profile/card#me')

    const navbar = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
    const selected = () => navbar.navbarItems.filter(item => item.selected).map(item => item.paneName)
    expect(selected()).toEqual(['social'])

    selectNavbarPane('profile')
    expect(selected()).toEqual(['profile'])

    selectNavbarPane('unknown')
    expect(selected()).toEqual(['profile'])
  })

  it('selects the storage item matching the pane URI', async () => {
    const storages = [1, 2].map(index => sym(`${window.location.origin}/other/storage-${index}/`))
    vi.mocked(getFolderPanesFromURI).mockResolvedValue(storages.map(folderPane))
    window.history.replaceState({}, '', '/other/profile/card#me')

    const navbar = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
    const selected = () => navbar.navbarItems.filter(item => item.selected).map(item => item.paneUri)

    selectNavbarPane('folder', storages[1].value)
    expect(selected()).toEqual([storages[1].value])

    selectNavbarPane('folder', `${window.location.origin}/unknown/`)
    expect(selected()).toEqual([storages[0].value])
  })

  it('associates each storage menu item with its own pane URI', async () => {
    const subject = sym(`${window.location.origin}/other/profile/card#me`)
    const storages = [1, 2].map(index => sym(`${window.location.origin}/other/storage-${index}/`))
    vi.mocked(getFolderPanesFromURI).mockResolvedValue(storages.map(folderPane))
    window.history.replaceState({
      paneName: 'folder',
      paneUri: storages[1].value
    }, '', subject.value)

    const navbar = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
    const storageItems = navbar.navbarItems.filter(item => item.paneName === 'folder')

    expect(storageItems.map(item => item.paneUri)).toEqual(storages.map(storage => storage.value))
    expect(storageItems.map(item => item.selected)).toEqual([false, true])
  })

  it.each(['/profile/card#me', '/profile/card'])('hides a new navbar on the own profile URL %s', async (url) => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/profile/card#me`))
    window.history.replaceState({}, '', url)

    const navbar = await createNavbar(navigation)

    expect(navbar).toHaveClass('navbar--hidden')
  })

  it.each([
    ['/profile/card#me', false],
    ['/other/profile/card#me', true],
    ['/storage/file.ttl', true],
    ['/profile/card#someone-else', true]
  ])('keeps the navbar visible for %s when logged in: %s', async (url, loggedIn) => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(
      loggedIn ? sym(`${window.location.origin}/profile/card#me`) : null
    )
    window.history.replaceState({}, '', url)

    const navbar = await createNavbar(navigation)

    expect(navbar).not.toHaveClass('navbar--hidden')
  })

  it.each(['/storage/', '/storage/docs/', '/storage/docs/file.ttl'])('hides the navbar within an owned storage at %s', async url => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/profile/card#me`))
    vi.mocked(getPodStorages).mockResolvedValue([sym(`${window.location.origin}/storage/`)])
    window.history.replaceState({}, '', url)

    expect(await createNavbar(navigation)).toHaveClass('navbar--hidden')
  })

  it('shows the navbar for the same storage resource when logged out', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(null)
    window.history.replaceState({}, '', '/storage/docs/file.ttl')

    expect(await createNavbar(navigation)).not.toHaveClass('navbar--hidden')
    expect(getPodStorages).not.toHaveBeenCalled()
  })

  it('updates visibility for resource links even when the navbar items do not change', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/profile/card#me`))
    vi.mocked(getPodStorages).mockResolvedValue([sym(`${window.location.origin}/storage/owned/`)])
    window.history.replaceState({}, '', '/storage/other/file.ttl')
    const navbar = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
    const items = navbar.navbarItems
    expect(navbar).not.toHaveClass('navbar--hidden')

    window.history.replaceState({}, '', '/storage/owned/file.ttl')
    announceNavigation(document)
    await vi.waitFor(() => expect(navbar).toHaveClass('navbar--hidden'))
    expect(navbar.navbarItems).toBe(items)

    window.history.replaceState({}, '', '/storage/other/file.ttl')
    announceNavigation(document)
    await vi.waitFor(() => expect(navbar).not.toHaveClass('navbar--hidden'))
  })

  it('updates an existing navbar when moving to and from the own profile', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/profile/card#me`))
    const navbar = document.createElement('solid-panes-navbar')
    document.body.appendChild(navbar)
    window.history.replaceState({}, '', '/profile/card#me')

    expect(await createNavbar(navigation)).toBe(navbar)
    expect(navbar).toHaveClass('navbar--hidden')

    window.history.replaceState({}, '', '/other/profile/card#me')
    expect(await createNavbar(navigation)).toBe(navbar)
    expect(navbar).not.toHaveClass('navbar--hidden')
  })

  it('matches the actual WebID rather than assuming a #me fragment', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/identity#person`))
    window.history.replaceState({}, '', '/identity#person')

    const navbar = await createNavbar(navigation)

    expect(navbar).toHaveClass('navbar--hidden')
  })

  describe('built from the pod the page is in', () => {
    it('offers Profile and Friends only when the owner of the pod is known', async () => {
      window.history.replaceState({}, '', '/other/container/')

      const unknown = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
      expect(unknown.navbarItems.map(item => item.paneName)).toEqual([])

      document.body.replaceChildren()
      resetPodContexts()
      window.history.replaceState({}, '', '/other/profile/card#me')

      const known = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
      expect(known.navbarItems.map(item => item.paneName)).toEqual(['profile', 'social'])
    })

    it('selects Profile on the WebID, but nothing on the document that holds it', async () => {
      loadProfile.mockResolvedValue(sym(`${window.location.origin}/timea2/profile/card#me`))

      window.history.replaceState({}, '', '/timea2/profile/card#me')
      const onWebId = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
      expect(onWebId.navbarItems.filter(item => item.selected).map(item => item.paneName)).toEqual(['profile'])

      document.body.replaceChildren()
      window.history.replaceState({}, '', '/timea2/profile/card')
      const onDocument = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
      expect(onDocument.navbarItems.map(item => item.paneName)).toEqual(['profile', 'social'])
      expect(onDocument.navbarItems.filter(item => item.selected)).toEqual([])
    })

    it('selects nothing on other pages of the pod', async () => {
      loadProfile.mockResolvedValue(sym(`${window.location.origin}/timea2/profile/card#me`))
      window.history.replaceState({}, '', '/timea2/docs/')

      const navbar = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }

      expect(navbar.navbarItems.map(item => item.paneName)).toEqual(['profile', 'social'])
      expect(navbar.navbarItems.filter(item => item.selected)).toEqual([])
    })

    it('asks the controller to display what is chosen', async () => {
      const show = vi.fn().mockResolvedValue(undefined)
      const owner = sym(`${window.location.origin}/a/profile/card#me`)
      const storage = folderPane(sym(`${window.location.origin}/a/`))
      loadProfile.mockResolvedValue(owner)
      vi.mocked(getFolderPanesFromURI).mockResolvedValue([storage])
      window.history.replaceState({}, '', '/a/docs/first')

      const navbar = await createNavbar({ show } as unknown as NavigationController) as HTMLElement & { navbarItems: NavbarMenuItem[] }
      for (const item of navbar.navbarItems) {
        navbar.dispatchEvent(new CustomEvent('solid-ui-select', { detail: item, bubbles: true }))
      }

      await vi.waitFor(() => expect(show).toHaveBeenCalledTimes(3))
      expect(show.mock.calls.map(call => call[0])).toEqual([
        { kind: 'profile', subject: owner.value },
        { kind: 'friends', subject: owner.value },
        { kind: 'storage', pane: storage }
      ])
    })

    describe('when a navigation moves within or between pods', () => {
      const ownerOf = (pod: string) => sym(`${window.location.origin}/${pod}/profile/card#me`)

      beforeEach(() => {
        loadProfile.mockImplementation(async (subject: ReturnType<typeof sym>) => {
          const [pod] = new URL(subject.uri).pathname.split('/').filter(Boolean)
          return ownerOf(pod)
        })
      })

      it('builds the items again for the new pod, with the selection of the new entry', async () => {
        window.history.replaceState({}, '', '/a/profile/card#me')
        const navbar = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
        expect(navbar.navbarItems.map(item => item.paneUri)).toEqual([ownerOf('a').value, ownerOf('a').value])

        window.history.replaceState({ paneName: 'social', paneUri: ownerOf('b').value }, '', '/b/docs/')
        announceNavigation(document)

        await vi.waitFor(() => {
          expect(navbar.navbarItems.map(item => item.paneUri)).toEqual([ownerOf('b').value, ownerOf('b').value])
        })
        expect(navbar.navbarItems.filter(item => item.selected).map(item => item.paneName)).toEqual(['social'])
      })

      it('keeps the items for another page in the same pod', async () => {
        window.history.replaceState({}, '', '/a/profile/card#me')
        const navbar = await createNavbar(navigation) as HTMLElement & { navbarItems: NavbarMenuItem[] }
        const items = navbar.navbarItems

        window.history.replaceState({}, '', '/a/docs/')
        announceNavigation(document)
        await new Promise(resolve => setTimeout(resolve, 20))

        expect(navbar.navbarItems).toBe(items)
      })

      it('stops following navigations once the navbar is gone', async () => {
        window.history.replaceState({}, '', '/a/profile/card#me')
        await createNavbar(navigation)
        document.body.replaceChildren()
        loadProfile.mockClear()
        resetPodContexts()

        window.history.replaceState({}, '', '/b/docs/')
        announceNavigation(document)
        await new Promise(resolve => setTimeout(resolve, 20))

        expect(loadProfile).not.toHaveBeenCalled()
      })
    })
  })
})
