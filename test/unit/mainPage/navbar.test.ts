import { afterEach, describe, expect, it, vi } from 'vitest'
import { authn } from 'solid-logic'
import { sym } from 'rdflib'
import type { OutlineManager } from '../../../src/outline/manager'
import type { NavbarMenuItem } from '../../../src/components/navbar/Navbar'
import { getFolderPanesFromURI } from '../../../src/utils/paneUtils'

vi.mock('../../../src/utils/paneUtils', () => ({
  getProfilePaneFromURI: vi.fn(),
  getSocialPaneFromURI: vi.fn(),
  getFolderPanesFromURI: vi.fn(async () => [])
}))

vi.mock('../../../src/utils/webIdUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/utils/webIdUtils')>(),
  loadProfileFromURI: async (subject: ReturnType<typeof sym>) => subject
}))

import { createNavbar } from '../../../src/mainPage/navbar'

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(getFolderPanesFromURI).mockResolvedValue([])
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

describe('page navbar visibility', () => {
  const outliner = {} as OutlineManager

  it('associates each storage menu item with its own pane URI', async () => {
    const subject = sym(`${window.location.origin}/other/profile/card#me`)
    const storages = [1, 2].map(index => sym(`${window.location.origin}/other/storage-${index}/`))
    vi.mocked(getFolderPanesFromURI).mockResolvedValue(storages.map(storage => ({
      name: 'folder',
      paneName: 'folder',
      subject: storage,
      label: () => 'Storage',
      render: vi.fn(),
      shouldGetFocus: () => false,
      requireQueryButton: false,
      icon: ''
    })))
    window.history.replaceState({
      paneName: 'folder',
      paneUri: storages[1].value
    }, '', subject.value)

    const navbar = await createNavbar(outliner) as HTMLElement & { navbarItems: NavbarMenuItem[] }
    const storageItems = navbar.navbarItems.filter(item => item.paneName === 'folder')

    expect(storageItems.map(item => item.paneUri)).toEqual(storages.map(storage => storage.value))
    expect(storageItems.map(item => item.profileSubjectUri)).toEqual([subject.value, subject.value])
    expect(storageItems.map(item => item.selected)).toEqual([false, true])
  })

  it.each(['/profile/card#me', '/profile/card'])('hides a new navbar on the own profile URL %s', async (url) => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/profile/card#me`))
    window.history.replaceState({}, '', url)

    const navbar = await createNavbar(outliner)

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

    const navbar = await createNavbar(outliner)

    expect(navbar).not.toHaveClass('navbar--hidden')
  })

  it('updates an existing navbar when moving to and from the own profile', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/profile/card#me`))
    const navbar = document.createElement('solid-panes-navbar')
    document.body.appendChild(navbar)
    window.history.replaceState({}, '', '/profile/card#me')

    expect(await createNavbar(outliner)).toBe(navbar)
    expect(navbar).toHaveClass('navbar--hidden')

    window.history.replaceState({}, '', '/other/profile/card#me')
    expect(await createNavbar(outliner)).toBe(navbar)
    expect(navbar).not.toHaveClass('navbar--hidden')
  })

  it('matches the actual WebID rather than assuming a #me fragment', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(sym(`${window.location.origin}/identity#person`))
    window.history.replaceState({}, '', '/identity#person')

    const navbar = await createNavbar(outliner)

    expect(navbar).toHaveClass('navbar--hidden')
  })
})
