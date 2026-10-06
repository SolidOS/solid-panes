import { afterEach, describe, expect, it, vi } from 'vitest'
import { authn, authSession, store } from 'solid-logic'
import { lit, sym } from 'rdflib'
import { ns } from 'solid-ui'

const { getViewerModeMock } = vi.hoisted(() => ({
  getViewerModeMock: vi.fn()
}))

vi.mock('profile-pane', async (importOriginal) => {
  const actual = await importOriginal<typeof import('profile-pane')>()

  return {
    ...actual,
    getViewerMode: getViewerModeMock
  }
})

vi.mock('../../../src/utils/webIdUtils', async () => {
  const actual = await vi.importActual<typeof import('../../../src/utils/webIdUtils')>('../../../src/utils/webIdUtils')
  return {
    ...actual,
    loadProfileFromURI: async (subject: ReturnType<typeof sym>) => subject
  }
})

import { initializeProfileHeading, refreshProfileHeading } from '../../../src/mainPage/profileHeading'

afterEach(() => {
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

describe('page-level profile heading', () => {
  it('renders for the active profile pane after concurrent refresh requests', async () => {
    const subject = sym('https://profile-heading.example/profile/card#me')
    store.add(subject, ns.vcard('fn'), lit('Profile Heading Test'), subject.doc())

    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    const navbar = document.createElement('solid-panes-navbar')
    const outline = document.createElement('table')
    outline.id = 'OutlineView'
    mainContent.append(navbar, outline)
    document.body.appendChild(mainContent)
    window.history.replaceState({
      paneName: 'profile',
      paneUri: subject.value
    }, '', '/')

    await Promise.all([refreshProfileHeading(), refreshProfileHeading()])

    const mount = document.getElementById('profile-heading-mount')
    const heading = mount?.querySelector('solid-panes-profile-heading') as (HTMLElement & {
      profileData?: { name: string }
      updateComplete?: Promise<unknown>
    }) | null
    await heading?.updateComplete

    expect(mount?.hidden).toBe(false)
    expect(mainContent.firstElementChild).toBe(mount)
    expect(heading?.profileData?.name).toBe('Profile Heading Test')
    expect(heading?.shadowRoot?.querySelector('h1')?.textContent).toBe('Profile Heading Test')
    expect(heading?.shadowRoot?.querySelector('.image-frame')).toHaveClass('image-frame--fallback')
    expect(heading?.shadowRoot?.querySelectorAll('.hero-fallback svg path')).toHaveLength(3)
    expect(heading?.shadowRoot?.querySelector('.profile__heading-edit-action')).toBeNull()
  })

  it('dispatches an edit event when the owner selects Edit', async () => {
    const heading = document.createElement('solid-panes-profile-heading') as HTMLElement & {
      profileData?: { name: string }
      canEdit?: boolean
      updateComplete?: Promise<unknown>
    }
    heading.profileData = { name: 'Profile Heading Test' }
    heading.canEdit = true
    document.body.appendChild(heading)

    const editRequested = vi.fn()
    heading.addEventListener('solid-panes-profile-heading-edit', editRequested)
    await heading.updateComplete
    const desktopEditButton = heading.shadowRoot?.querySelector<HTMLElement>('.desktop-edit-button')
    expect(desktopEditButton).toHaveAttribute('variant', 'tertiary')
    const mobileEditButton = heading.shadowRoot?.querySelector('.mobile-edit-button')
    expect(mobileEditButton).toHaveAttribute('variant', 'ghost')
    expect(mobileEditButton?.querySelector('svg')).toHaveAttribute('width', '14')
    expect(mobileEditButton?.querySelector('svg')).toHaveAttribute('height', '14')
    desktopEditButton?.click()

    expect(editRequested).toHaveBeenCalledOnce()
  })

  it('rechecks owner edit access after a restored session', async () => {
    getViewerModeMock.mockReset()
    const subject = sym('https://profile-heading.example/profile/card#me')
    let sessionReady = false
    const checkUser = vi.spyOn(authn, 'checkUser').mockImplementation(async () => {
      sessionReady = true
      return subject
    })
    getViewerModeMock.mockImplementation(async () => sessionReady ? 'owner' : 'anonymous')

    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({
      paneName: 'profile',
      paneUri: subject.value
    }, '', '/')

    initializeProfileHeading()
    await refreshProfileHeading(true)
    expect(checkUser).toHaveBeenCalledOnce()

    const getHeading = () => document.querySelector('solid-panes-profile-heading') as (HTMLElement & {
      canEdit?: boolean
      updateComplete?: Promise<unknown>
    }) | null

    await vi.waitFor(async () => {
      await getHeading()?.updateComplete
      expect(getHeading()?.canEdit).toBe(true)
    })

    sessionReady = false
    authSession.events.emit('logout')

    await vi.waitFor(async () => {
      await getHeading()?.updateComplete
      expect(getHeading()?.canEdit).toBe(false)
    })

    checkUser.mockRestore()
  })

  it('hides the mount for panes other than profile and social', async () => {
    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({ paneName: 'folder' }, '', '/')

    await refreshProfileHeading()

    expect(document.getElementById('profile-heading-mount')?.hidden).toBe(true)
  })
})
