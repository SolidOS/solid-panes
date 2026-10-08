import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authn, store } from 'solid-logic'
import { lit, st, sym } from 'rdflib'
import { ns } from 'solid-ui'
import ProfileHeading from '../../../src/components/profile-heading/ProfileHeading'
import { refreshProfileHeading } from '../../../src/mainPage/profileHeading'

vi.mock('../../../src/utils/webIdUtils', () => ({
  loadProfileFromURI: async (subject: ReturnType<typeof sym>) => subject
}))

const viewer = sym('https://friends-viewer.example/profile/card#me')
const subject = sym('https://friends-subject.example/profile/card#me')

beforeEach(() => {
  vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
  vi.spyOn(store.fetcher, 'load').mockResolvedValue(undefined)
  vi.spyOn(store, 'whether').mockReturnValue(0)
  vi.spyOn(store.updater, 'update').mockResolvedValue(undefined)
})

afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
})

async function createHeading (friendSubject = subject) {
  const heading = document.createElement('solid-panes-profile-heading') as ProfileHeading
  heading.profileData = { name: 'Friend Test' }
  heading.friendSubject = friendSubject
  document.body.appendChild(heading)
  await vi.waitFor(() => expect(heading.friendState).not.toBe('loading'))
  await heading.updateComplete
  return heading
}

function button (heading: ProfileHeading) {
  return heading.shadowRoot?.querySelector<HTMLElement>('.profile__btn-friends')
}

describe('profile heading friends', () => {
  it.each(['success', 'error'])('dismisses %s feedback after exactly 10 seconds', async (result) => {
    const heading = await createHeading()
    if (result === 'error') {
      vi.mocked(store.updater.update).mockRejectedValueOnce(new Error('Write denied'))
    }
    vi.useFakeTimers()
    button(heading)?.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(heading.shadowRoot?.querySelector('.friend-message')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(9999)
    expect(heading.shadowRoot?.querySelector('.friend-message')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(heading.shadowRoot?.querySelector('.friend-message')).toBeNull()
    expect(heading.friendState).toBe(result === 'success' ? 'exists' : 'error')
  })

  it('restarts the dismissal timer for new feedback', async () => {
    const heading = await createHeading()
    vi.mocked(store.updater.update).mockRejectedValueOnce(new Error('Write denied'))
    vi.useFakeTimers()
    button(heading)?.click()
    await vi.advanceTimersByTimeAsync(5000)
    button(heading)?.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(heading.friendMessage).toBe('Friend was added!')
    await vi.advanceTimersByTimeAsync(5000)
    expect(heading.friendMessage).toBe('Friend was added!')
    await vi.advanceTimersByTimeAsync(5000)
    expect(heading.friendMessage).toBe('')
  })

  it('clears the dismissal timer when disconnected', async () => {
    const heading = await createHeading()
    vi.useFakeTimers()
    button(heading)?.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)
    heading.remove()
    expect(vi.getTimerCount()).toBe(0)
    expect(heading.friendMessage).toBe('')
  })

  it('checks the viewer profile and adds foaf:knows in that document', async () => {
    const heading = await createHeading()
    expect(store.fetcher.load).toHaveBeenCalledWith(viewer)
    expect(button(heading)?.textContent).toBe('Add as friend')
    button(heading)?.click()
    button(heading)?.click()
    await vi.waitFor(() => expect(heading.friendState).toBe('exists'))
    await heading.updateComplete
    expect(store.updater.update).toHaveBeenCalledExactlyOnceWith(
      [], [st(viewer, ns.foaf('knows'), subject, viewer.doc())]
    )
    expect(button(heading)).toHaveAttribute('disabled')
    expect(button(heading)?.textContent).toBe('Already a friend')
    const message = heading.shadowRoot?.querySelector('.friend-message')
    expect(message).toHaveAttribute('role', 'status')
    expect(message?.textContent).toContain('Friend was added!')
    expect(heading.shadowRoot?.activeElement).toBe(message)
  })

  it('disables the button for an existing friend', async () => {
    vi.mocked(store.whether).mockReturnValue(1)
    const heading = await createHeading()
    expect(button(heading)).toHaveAttribute('disabled')
    expect(button(heading)?.textContent).toBe('Already a friend')
    button(heading)?.dispatchEvent(new Event('click'))
    expect(store.updater.update).not.toHaveBeenCalled()
  })

  it('shows update errors and supports retry without stale feedback', async () => {
    vi.mocked(store.updater.update).mockRejectedValueOnce(new Error('Write denied'))
    const heading = await createHeading()
    button(heading)?.click()
    await vi.waitFor(() => expect(heading.friendState).toBe('error'))
    await heading.updateComplete
    expect(heading.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain('Write denied')
    button(heading)?.click()
    await vi.waitFor(() => expect(heading.friendState).toBe('exists'))
    await heading.updateComplete
    expect(heading.shadowRoot?.querySelector('[role="alert"]')).toBeNull()
    expect(heading.friendMessage).toBe('Friend was added!')
  })

  it('shows load errors rather than enabling an unchecked action', async () => {
    vi.mocked(store.fetcher.load).mockRejectedValueOnce(new Error('Profile unavailable'))
    const heading = await createHeading()
    expect(heading.friendState).toBe('error')
    expect(heading.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain('Profile unavailable')
    expect(store.updater.update).not.toHaveBeenCalled()
  })

  it('maps unauthenticated update errors to the original login message', async () => {
    vi.mocked(store.updater.update).mockRejectedValueOnce(new Error('Unauthenticated'))
    const heading = await createHeading()
    button(heading)?.click()
    await vi.waitFor(() => expect(heading.friendState).toBe('error'))
    expect(heading.friendMessage).toBe('Current user not found! Not logged in?')
  })

  it('rejects a friendship that was added after the initial check', async () => {
    const heading = await createHeading()
    vi.mocked(store.whether).mockReturnValue(1)
    button(heading)?.click()
    await vi.waitFor(() => expect(heading.friendState).toBe('error'))
    expect(heading.friendMessage).toBe('Friend already exists')
    expect(store.updater.update).not.toHaveBeenCalled()
  })

  it('does not write if the viewer logs out while loading their profile', async () => {
    const heading = await createHeading()
    vi.mocked(store.fetcher.load).mockImplementationOnce(async () => {
      vi.mocked(authn.currentUser).mockReturnValue(null)
      return undefined
    })
    button(heading)?.click()
    await vi.waitFor(() => expect(heading.friendState).toBe('error'))
    expect(store.updater.update).not.toHaveBeenCalled()
  })

  it('ignores a stale friend check after navigation', async () => {
    let finish: (() => void) | undefined
    vi.mocked(store.fetcher.load).mockImplementationOnce(() => new Promise(resolve => {
      finish = () => resolve(undefined)
    }))
    const heading = document.createElement('solid-panes-profile-heading') as ProfileHeading
    heading.profileData = { name: 'First' }
    heading.friendSubject = subject
    document.body.appendChild(heading)
    await heading.updateComplete
    heading.friendSubject = sym('https://second-friend.example/#me')
    await vi.waitFor(() => expect(heading.friendState).toBe('available'))
    vi.mocked(store.whether).mockReturnValue(1)
    finish?.()
    await Promise.resolve()
    await heading.updateComplete
    expect(heading.friendState).toBe('available')
  })

  it('places friends before Edit when both actions are provided', async () => {
    const heading = await createHeading()
    heading.editContext = {
      subject,
      profileData: { name: 'Friend Test', entryNode: subject },
      viewerMode: 'owner',
      onSaved: vi.fn()
    }
    await heading.updateComplete
    expect(heading.shadowRoot?.querySelector('.profile__actions solid-ui-button')).toBe(button(heading))
    expect(heading.shadowRoot?.querySelector('.desktop-edit-button')).not.toBeNull()
  })

  it.each([
    ['profile', viewer, subject, true],
    ['profile', viewer, viewer, false],
    ['profile', null, subject, false],
    ['social', viewer, subject, false],
    ['profile', viewer, sym('https://new-friend.example/#me'), true]
  ])('gates the action for pane %s, viewer %s, subject %s', async (paneName, me, viewed, visible) => {
    vi.mocked(authn.currentUser).mockReturnValue(me)
    store.add(viewed, ns.vcard('fn'), lit('Gating Test'), viewed.doc())
    const main = document.createElement('main')
    main.id = 'MainContent'
    document.body.appendChild(main)
    window.history.replaceState({ paneName, paneUri: viewed.value }, '', '/')
    await refreshProfileHeading(true)
    const heading = main.querySelector<ProfileHeading>('solid-panes-profile-heading')
    await heading?.updateComplete
    expect(Boolean(button(heading!))).toBe(visible)
    expect(Boolean(heading?.friendSubject)).toBe(visible)
  })
})
