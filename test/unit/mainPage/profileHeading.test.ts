import { afterEach, describe, expect, it, vi } from 'vitest'
import { authn, authSession, store } from 'solid-logic'
import { lit, sym } from 'rdflib'
import { ns } from 'solid-ui'

const { getViewerModeMock, createHeadingEditDialogMock } = vi.hoisted(() => ({
  getViewerModeMock: vi.fn(),
  createHeadingEditDialogMock: vi.fn()
}))

vi.mock('../../../src/components/profile-heading/editor/sections/heading/HeadingEditDialog', () => ({
  createHeadingEditDialog: createHeadingEditDialogMock
}))

vi.mock('../../../src/components/profile-heading/profileHeadingData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/components/profile-heading/profileHeadingData')>()

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

  it('opens the heading editor from Edit and announces the save to other views', async () => {
    const subject = sym('https://edit-flow.example/profile/card#me')
    const profileData = { entryNode: subject, name: 'Profile Heading Test' }
    const onSaved = vi.fn()
    createHeadingEditDialogMock.mockReset().mockImplementation(
      async (_event, _store, _subject, _profile, _viewerMode, saved) => saved()
    )
    const heading = document.createElement('solid-panes-profile-heading') as HTMLElement & {
      profileData?: typeof profileData
      editContext?: unknown
      updateComplete?: Promise<unknown>
    }
    heading.profileData = profileData
    heading.editContext = { subject, profileData, viewerMode: 'owner', onSaved }
    document.body.appendChild(heading)
    await heading.updateComplete

    const headingSaved = vi.fn()
    document.addEventListener('profile-heading-saved', headingSaved)
    try {
      const desktopEditButton = heading.shadowRoot?.querySelector<HTMLElement>('.desktop-edit-button')
      expect(desktopEditButton).toHaveAttribute('variant', 'tertiary')
      const mobileEditButton = heading.shadowRoot?.querySelector('.mobile-edit-button')
      expect(mobileEditButton).toHaveAttribute('variant', 'ghost')
      expect(mobileEditButton?.querySelector('icon-lucide-pencil')).not.toBeNull()
      desktopEditButton?.click()

      await vi.waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
      expect(createHeadingEditDialogMock).toHaveBeenCalledWith(
        expect.any(Event), store, subject, profileData, 'owner', expect.any(Function)
      )
      expect(headingSaved).toHaveBeenCalledOnce()
      expect((headingSaved.mock.calls[0][0] as CustomEvent).detail).toEqual({ subjectUri: subject.value })
    } finally {
      document.removeEventListener('profile-heading-saved', headingSaved)
    }
  })

  it('does not announce a save when the editor is closed without saving', async () => {
    const subject = sym('https://edit-flow-cancel.example/profile/card#me')
    const profileData = { entryNode: subject, name: 'Profile Heading Test' }
    const onSaved = vi.fn()
    createHeadingEditDialogMock.mockReset().mockResolvedValue(undefined)
    const heading = document.createElement('solid-panes-profile-heading') as HTMLElement & {
      profileData?: typeof profileData
      editContext?: unknown
      updateComplete?: Promise<unknown>
    }
    heading.profileData = profileData
    heading.editContext = { subject, profileData, viewerMode: 'owner', onSaved }
    document.body.appendChild(heading)
    await heading.updateComplete

    const headingSaved = vi.fn()
    document.addEventListener('profile-heading-saved', headingSaved)
    try {
      heading.shadowRoot?.querySelector<HTMLElement>('.desktop-edit-button')?.click()
      await vi.waitFor(() => expect(createHeadingEditDialogMock).toHaveBeenCalledOnce())
      expect(headingSaved).not.toHaveBeenCalled()
      expect(onSaved).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('profile-heading-saved', headingSaved)
    }
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

    expect(heading.shadowRoot?.querySelector('.detail-icon icon-lucide-cake')).not.toBeNull()
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
      editContext?: unknown
      updateComplete?: Promise<unknown>
    }) | null

    await vi.waitFor(async () => {
      await getHeading()?.updateComplete
      expect(getHeading()?.editContext).toBeTruthy()
    })

    sessionReady = false
    authSession.events.emit('logout')

    await vi.waitFor(async () => {
      await getHeading()?.updateComplete
      expect(getHeading()?.editContext).toBeUndefined()
    })

    checkUser.mockRestore()
  })

  it('hides extra information and editing in compact mode, then restores the full heading', async () => {
    const heading = document.createElement('solid-panes-profile-heading') as HTMLElement & {
      profileData: {
        name: string
        jobTitle: string
        pronouns: string
        dateOfBirth: string
        location: string
        primaryEmail: { valueNode: ReturnType<typeof sym> }
      }
      compact: boolean
      editContext: {
        subject: ReturnType<typeof sym>
        profileData: { entryNode: ReturnType<typeof sym>; name: string }
        viewerMode: 'owner'
        onSaved: () => void
      }
      updateComplete: Promise<unknown>
    }
    heading.profileData = {
      name: 'Compact Heading Test',
      jobTitle: 'Engineer',
      pronouns: 'she/her',
      dateOfBirth: '2000-01-02',
      location: 'Paris, France',
      primaryEmail: { valueNode: sym('mailto:compact@example.com') }
    }
    heading.editContext = {
      subject: sym('https://compact-heading.example/profile/card#me'),
      profileData: {
        entryNode: sym('https://compact-heading.example/profile/card#me'),
        name: 'Compact Heading Test'
      },
      viewerMode: 'owner',
      onSaved: vi.fn()
    }
    document.body.appendChild(heading)
    await heading.updateComplete
    const avatar = heading.shadowRoot?.querySelector('.image-frame')
    const details = heading.shadowRoot?.querySelector('.details-collapse')
    expect(details).toHaveAttribute('aria-hidden', 'false')
    expect(heading.shadowRoot?.querySelector('.pronouns')).not.toHaveAttribute('hidden')

    heading.compact = true
    await heading.updateComplete
    expect(heading).toHaveAttribute('compact')
    expect(details).toHaveAttribute('aria-hidden', 'true')
    expect(details).toHaveAttribute('inert')
    expect(heading.shadowRoot?.querySelector('.pronouns')).toHaveAttribute('hidden')
    expect(heading.shadowRoot?.querySelector('.profile__heading-edit-action')).toBeNull()
    expect(heading.shadowRoot?.querySelector('.name')?.textContent).toBe('Compact Heading Test')
    expect(heading.shadowRoot?.querySelector('.role')?.textContent).toBe('Engineer')
    expect(heading.shadowRoot?.querySelector('.image-frame')).toBe(avatar)

    heading.compact = false
    await heading.updateComplete
    expect(heading).not.toHaveAttribute('compact')
    expect(details).not.toHaveAttribute('inert')
    expect(details).toHaveAttribute('aria-hidden', 'false')
    expect(heading.shadowRoot?.querySelector('.pronouns')).not.toHaveAttribute('hidden')
    expect(heading.shadowRoot?.querySelector('.profile__heading-edit-action')).not.toBeNull()
    expect(heading.shadowRoot?.querySelector('.image-frame')).toBe(avatar)
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
      editContext?: unknown
      compact?: boolean
      updateComplete?: Promise<unknown>
    }) | null
    await heading?.updateComplete
    expect(heading?.editContext).toBeUndefined()
    expect(heading?.compact).toBe(true)
    expect(heading?.shadowRoot?.querySelector('.profile__heading-edit-action')).toBeNull()

    window.history.replaceState({
      paneName: 'profile',
      paneUri: subject.value
    }, '', '/')
    await refreshProfileHeading(true)
    await heading?.updateComplete

    expect(heading?.editContext).toBeTruthy()
    expect(heading?.compact).toBe(false)
    expect(heading?.shadowRoot?.querySelector('.profile__heading-edit-action')).not.toBeNull()

    window.history.replaceState({
      paneName: 'social',
      paneUri: subject.value
    }, '', '/')
    await refreshProfileHeading()
    await heading?.updateComplete

    expect(document.querySelector('solid-panes-profile-heading')).toBe(heading)
    expect(heading?.compact).toBe(true)
    expect(heading?.editContext).toBeUndefined()
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
      editContext?: unknown
      compact?: boolean
      updateComplete?: Promise<unknown>
    }) | null
    await heading?.updateComplete

    expect(mount?.hidden).toBe(false)
    expect(heading?.profileData?.name).toBe('Another Person')
    expect(heading?.editContext).toBeUndefined()
    expect(heading?.compact).toBe(true)
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

  it.each(['profile', 'social'])('animates appearance on %s from a pane without a heading', async (paneName) => {
    const subject = sym(`https://show-${paneName}.example/profile/card#me`)
    getViewerModeMock.mockResolvedValue('owner')
    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({ paneName: 'folder' }, '', '/')
    await refreshProfileHeading(true)
    const mount = document.getElementById('profile-heading-mount')!
    let complete!: () => void
    const finished = new Promise<void>(resolve => { complete = resolve })
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ finished, cancel }))
    Object.defineProperty(mount, 'animate', { value: animate })
    window.history.replaceState({ paneName, paneUri: subject.value }, '', '/')
    await refreshProfileHeading()
    await refreshProfileHeading()

    expect(animate).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledWith([
      expect.objectContaining({ height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px' }),
      expect.objectContaining({ opacity: 1, marginTop: '18px', marginBottom: '20px' })
    ], { duration: 300, easing: 'ease', fill: 'both' })
    const heading = mount.firstElementChild as HTMLElement & { compact: boolean }
    expect(heading.compact).toBe(paneName !== 'profile')
    expect(heading.shadowRoot?.querySelector('.profile-heading')).not.toBeNull()
    expect(mount.hidden).toBe(false)
    expect(mount.inert).toBe(false)
    complete()
    await finished
    expect(cancel).toHaveBeenCalledOnce()
    expect(mount.firstElementChild).toBe(heading)
    expect(mount.hidden).toBe(false)
  })

  it('cancels appearance when navigating away before it finishes', async () => {
    const subject = sym('https://cancel-show.example/profile/card#me')
    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({ paneName: 'folder' }, '', '/')
    await refreshProfileHeading(true)
    const mount = document.getElementById('profile-heading-mount')!
    let completeShow!: () => void
    let completeHide!: () => void
    const shown = new Promise<void>(resolve => { completeShow = resolve })
    const hidden = new Promise<void>(resolve => { completeHide = resolve })
    const cancelShow = vi.fn()
    const animate = vi.fn()
      .mockReturnValueOnce({ finished: shown, cancel: cancelShow })
      .mockReturnValueOnce({ finished: hidden, cancel: vi.fn() })
    Object.defineProperty(mount, 'animate', { value: animate })
    window.history.replaceState({ paneName: 'social', paneUri: subject.value }, '', '/')
    await refreshProfileHeading()
    window.history.replaceState({ paneName: 'folder' }, '', '/')
    await refreshProfileHeading()
    expect(cancelShow).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledTimes(2)
    completeShow()
    await shown
    expect(mount.hidden).toBe(false)
    completeHide()
    await hidden
    expect(mount.hidden).toBe(true)
    expect(mount.firstElementChild).toBeNull()
  })

  it.each(['profile', 'social'])('animates disappearance from %s before removing the heading', async (paneName) => {
    const subject = sym(`https://hide-${paneName}.example/profile/card#me`)
    getViewerModeMock.mockResolvedValue('owner')
    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({ paneName, paneUri: subject.value }, '', '/')
    await refreshProfileHeading(true)

    const mount = document.getElementById('profile-heading-mount')!
    const heading = mount.firstElementChild
    let complete!: () => void
    const finished = new Promise<void>(resolve => { complete = resolve })
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ finished, cancel }))
    Object.defineProperty(mount, 'animate', { value: animate })
    window.history.replaceState({ paneName: 'folder' }, '', '/')
    await refreshProfileHeading()
    await refreshProfileHeading()

    expect(animate).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px' })
    ]), { duration: 300, easing: 'ease', fill: 'forwards' })
    expect(mount.hidden).toBe(false)
    expect(mount.firstElementChild).toBe(heading)
    expect(mount.inert).toBe(true)
    expect(mount).toHaveAttribute('aria-hidden', 'true')

    complete()
    await finished
    expect(mount.hidden).toBe(true)
    expect(mount.firstElementChild).toBeNull()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('cancels disappearance when navigating back before it finishes', async () => {
    const subject = sym('https://cancel-hide.example/profile/card#me')
    getViewerModeMock.mockResolvedValue('owner')
    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({ paneName: 'profile', paneUri: subject.value }, '', '/')
    await refreshProfileHeading(true)

    const mount = document.getElementById('profile-heading-mount')!
    const heading = mount.firstElementChild
    let complete!: () => void
    const finished = new Promise<void>(resolve => { complete = resolve })
    const cancel = vi.fn()
    Object.defineProperty(mount, 'animate', { value: vi.fn(() => ({ finished, cancel })) })
    window.history.replaceState({ paneName: 'folder' }, '', '/')
    await refreshProfileHeading()
    window.history.replaceState({ paneName: 'social', paneUri: subject.value }, '', '/')
    await refreshProfileHeading()
    expect(cancel).toHaveBeenCalledOnce()
    expect(mount.inert).toBe(false)
    expect(mount).not.toHaveAttribute('aria-hidden')

    complete()
    await finished
    expect(mount.hidden).toBe(false)
    expect(mount.firstElementChild).toBe(heading)
  })

  it('skips appearance and disappearance animations when reduced motion is requested', async () => {
    const subject = sym('https://reduced-hide.example/profile/card#me')
    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({ paneName: 'social', paneUri: subject.value }, '', '/')
    await refreshProfileHeading(true)
    const mount = document.getElementById('profile-heading-mount')!
    const animate = vi.fn()
    Object.defineProperty(mount, 'animate', { value: animate })
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })))
    try {
      window.history.replaceState({ paneName: 'folder' }, '', '/')
      await refreshProfileHeading()
      expect(animate).not.toHaveBeenCalled()
      expect(mount.hidden).toBe(true)
      expect(mount.firstElementChild).toBeNull()
      window.history.replaceState({ paneName: 'social', paneUri: subject.value }, '', '/')
      await refreshProfileHeading()
      expect(animate).not.toHaveBeenCalled()
      expect(mount.hidden).toBe(false)
      expect(mount.firstElementChild).not.toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
