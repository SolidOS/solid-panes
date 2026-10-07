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
    expect(heading?.shadowRoot?.querySelector('.hero-fallback icon-lucide-circle-user-round')).not.toBeNull()
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
    expect(mobileEditButton?.querySelector('icon-lucide-pencil')).not.toBeNull()
    desktopEditButton?.click()

    expect(editRequested).toHaveBeenCalledOnce()
  })

  it('renders Lucide icons for profile detail rows', async () => {
    const heading = document.createElement('solid-panes-profile-heading') as HTMLElement & {
      profileData?: {
        name: string
        dateOfBirth: string
        location: string
        primaryPhone: { valueNode: ReturnType<typeof lit> }
        primaryEmail: { valueNode: ReturnType<typeof lit> }
      }
      updateComplete?: Promise<unknown>
    }
    heading.profileData = {
      name: 'Profile Heading Test',
      dateOfBirth: '2001-02-03',
      location: 'Example City',
      primaryPhone: { valueNode: lit('tel:+123456789') },
      primaryEmail: { valueNode: lit('mailto:person@example.com') }
    }
    document.body.appendChild(heading)
    await heading.updateComplete

    expect(heading.shadowRoot?.querySelector('.detail-icon icon-lucide-calendar-days')).not.toBeNull()
    expect(heading.shadowRoot?.querySelector('.detail-icon icon-lucide-map-pin')).not.toBeNull()
    expect(heading.shadowRoot?.querySelector('.detail-icon icon-lucide-phone')).not.toBeNull()
    expect(heading.shadowRoot?.querySelector('.detail-icon icon-lucide-mail')).not.toBeNull()
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

  it('only enables heading editing on the profile pane', async () => {
    getViewerModeMock.mockReset().mockResolvedValue('owner')
    const subject = sym('https://profile-heading.example/profile/card#me')
    store.add(subject, ns.vcard('fn'), lit('Profile Heading Test'), subject.doc())

    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)

    window.history.replaceState({
      paneName: 'social',
      paneUri: subject.value
    }, '', '/')
    await refreshProfileHeading(true)

    const heading = document.querySelector('solid-panes-profile-heading') as (HTMLElement & {
      canEdit?: boolean
      updateComplete?: Promise<unknown>
    }) | null
    await heading?.updateComplete
    expect(heading?.canEdit).toBe(false)
    expect(heading?.shadowRoot?.querySelector('.profile__heading-edit-action')).toBeNull()

    window.history.replaceState({
      paneName: 'profile',
      paneUri: subject.value
    }, '', '/')
    await refreshProfileHeading(true)
    await heading?.updateComplete

    expect(heading?.canEdit).toBe(true)
    expect(heading?.shadowRoot?.querySelector('.profile__heading-edit-action')).not.toBeNull()
  })

  it('refreshes the heading job title when the displayed profile saves resume changes', async () => {
    const subject = sym('https://resume-heading.example/profile/card#me')
    const membership = sym('https://resume-heading.example/profile/card#role')
    const doc = subject.doc()
    store.add(subject, ns.vcard('fn'), lit('Resume Heading Test'), doc)
    store.add(membership, ns.org('member'), subject, doc)
    store.add(membership, ns.rdf('type'), ns.solid('CurrentRole'), doc)
    store.add(membership, ns.vcard('role'), lit('Engineer'), doc)
    getViewerModeMock.mockResolvedValue('owner')

    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    const profilePane = document.createElement('div')
    mainContent.appendChild(profilePane)
    document.body.appendChild(mainContent)
    window.history.replaceState({
      paneName: 'profile',
      paneUri: subject.value
    }, '', '/')
    initializeProfileHeading()
    await refreshProfileHeading(true)

    const heading = document.querySelector('solid-panes-profile-heading') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await heading.updateComplete
    expect(heading.shadowRoot?.querySelector('.role')?.textContent).toBe('Engineer')

    store.removeMany(membership, ns.vcard('role'), null, doc)
    store.add(membership, ns.vcard('role'), lit('Staff Engineer'), doc)

    profilePane.dispatchEvent(new CustomEvent('profile-pane-saved', {
      bubbles: true,
      composed: true,
      detail: { subjectUri: 'https://unrelated.example/profile/card#me' }
    }))
    await Promise.resolve()
    expect(heading.shadowRoot?.querySelector('.role')?.textContent).toBe('Engineer')

    profilePane.dispatchEvent(new CustomEvent('profile-pane-saved', {
      bubbles: true,
      composed: true,
      detail: { subjectUri: subject.value }
    }))
    await vi.waitFor(async () => {
      await heading.updateComplete
      expect(heading.shadowRoot?.querySelector('.role')?.textContent).toBe('Staff Engineer')
    })

    store.removeMany(membership, ns.vcard('role'), null, doc)
    profilePane.dispatchEvent(new CustomEvent('profile-pane-saved', {
      bubbles: true,
      composed: true,
      detail: { subjectUri: subject.value }
    }))
    await vi.waitFor(async () => {
      await heading.updateComplete
      expect(heading.shadowRoot?.querySelector('.role')).toBeNull()
    })
  })

  it('refreshes heading contact details after More contacts saves additions, edits, and removals', async () => {
    const subject = sym('https://contacts-heading.example/profile/card#me')
    const doc = subject.doc()
    const phone = sym(`${doc.value}#phone`)
    const email = sym(`${doc.value}#email`)
    const address = sym(`${doc.value}#address`)
    store.add(subject, ns.vcard('fn'), lit('Contacts Heading Test'), doc)
    getViewerModeMock.mockResolvedValue('owner')

    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    const profilePane = document.createElement('div')
    mainContent.appendChild(profilePane)
    document.body.appendChild(mainContent)
    window.history.replaceState({
      paneName: 'profile',
      paneUri: subject.value
    }, '', '/')
    initializeProfileHeading()
    await refreshProfileHeading(true)

    const heading = document.querySelector('solid-panes-profile-heading') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    const values = () => Array.from(
      heading.shadowRoot?.querySelectorAll('.detail-value') ?? [],
      element => element.textContent
    )
    const notifySaved = () => profilePane.dispatchEvent(new CustomEvent('profile-pane-saved', {
      bubbles: true,
      composed: true,
      detail: { subjectUri: subject.value }
    }))
    await heading.updateComplete
    expect(values()).toEqual([])

    store.add(subject, ns.vcard('hasTelephone'), phone, doc)
    store.add(phone, ns.vcard('value'), sym('tel:+123456789'), doc)
    store.add(phone, ns.rdf('type'), ns.vcard('Work'), doc)
    store.add(subject, ns.vcard('hasEmail'), email, doc)
    store.add(email, ns.vcard('value'), sym('mailto:work@example.com'), doc)
    store.add(email, ns.rdf('type'), ns.vcard('Work'), doc)
    store.add(subject, ns.vcard('hasAddress'), address, doc)
    store.add(address, ns.vcard('locality'), lit('Paris'), doc)
    store.add(address, ns.vcard('country-name'), lit('France'), doc)
    notifySaved()
    await vi.waitFor(async () => {
      await heading.updateComplete
      expect(values()).toEqual(['Paris, France', '+123456789', 'work@example.com'])
    })

    store.removeMany(phone, ns.vcard('value'), null, doc)
    store.add(phone, ns.vcard('value'), sym('tel:+987654321'), doc)
    store.removeMany(email, ns.vcard('value'), null, doc)
    store.add(email, ns.vcard('value'), sym('mailto:updated@example.com'), doc)
    store.removeMany(address, ns.vcard('locality'), null, doc)
    store.add(address, ns.vcard('locality'), lit('Lyon'), doc)
    notifySaved()
    await vi.waitFor(async () => {
      await heading.updateComplete
      expect(values()).toEqual(['Lyon, France', '+987654321', 'updated@example.com'])
    })

    store.removeMany(subject, ns.vcard('hasTelephone'), null, doc)
    store.removeMany(subject, ns.vcard('hasEmail'), null, doc)
    store.removeMany(subject, ns.vcard('hasAddress'), null, doc)
    notifySaved()
    await vi.waitFor(async () => {
      await heading.updateComplete
      expect(values()).toEqual([])
    })
  })

  it('uses fresh contact data from the saving pane instead of reloading older store values', async () => {
    const subject = sym('https://saved-contacts.example/profile/card#me')
    store.add(subject, ns.vcard('fn'), lit('Saved Contacts Test'), subject.doc())
    store.add(subject, ns.vcard('hasEmail'), sym('mailto:old@example.com'), subject.doc())
    getViewerModeMock.mockResolvedValue('owner')

    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({
      paneName: 'profile',
      paneUri: subject.value
    }, '', '/')
    initializeProfileHeading()
    await refreshProfileHeading(true)
    const heading = document.querySelector('solid-panes-profile-heading') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await heading.updateComplete
    expect(heading.shadowRoot?.textContent).toContain('old@example.com')

    mainContent.dispatchEvent(new CustomEvent('profile-pane-saved', {
      bubbles: true,
      composed: true,
      detail: {
        subjectUri: subject.value,
        profileData: {
          name: 'Saved Contacts Test',
          primaryPhone: { valueNode: sym('tel:+123456789') },
          primaryEmail: { valueNode: sym('mailto:new@example.com') },
          location: 'Lyon, France'
        }
      }
    }))
    await heading.updateComplete
    expect(heading.shadowRoot?.textContent).toContain('new@example.com')
    expect(heading.shadowRoot?.textContent).toContain('+123456789')
    expect(heading.shadowRoot?.textContent).toContain('Lyon, France')
    expect(heading.shadowRoot?.textContent).not.toContain('old@example.com')
  })

  it('keeps another person\'s heading visible on their other navbar panes', async () => {
    const subject = sym('https://another-profile-heading.example/profile/card#me')
    const storage = sym('https://profile-heading.example/storage/')
    const viewer = sym('https://viewer.example/profile/card#me')
    store.add(subject, ns.vcard('fn'), lit('Another Person'), subject.doc())

    const currentUser = vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    const navbar = document.createElement('solid-panes-navbar') as HTMLElement & {
      navbarItems?: Array<{ paneName: string, profileSubjectUri: string }>
    }
    navbar.navbarItems = [{
      paneName: 'folder',
      profileSubjectUri: subject.value
    }]
    mainContent.appendChild(navbar)
    document.body.appendChild(mainContent)
    window.history.replaceState({
      paneName: 'folder',
      paneUri: storage.value
    }, '', '/')

    await refreshProfileHeading(true)

    const mount = document.getElementById('profile-heading-mount')
    const heading = mount?.querySelector('solid-panes-profile-heading') as (HTMLElement & {
      profileData?: { name: string }
      canEdit?: boolean
      updateComplete?: Promise<unknown>
    }) | null
    await heading?.updateComplete

    expect(mount?.hidden).toBe(false)
    expect(heading?.profileData?.name).toBe('Another Person')
    expect(heading?.canEdit).toBe(false)
    expect(heading?.shadowRoot?.querySelector('.profile__heading-edit-action')).toBeNull()

    currentUser.mockRestore()
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
