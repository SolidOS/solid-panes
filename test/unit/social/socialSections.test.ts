import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import { store } from 'solid-logic'
import { ns } from 'solid-ui'
import { createAllFriendsSection } from '../../../src/social/socialSections'

vi.mock('../../../src/social/editProfileDetails', () => ({
  appendProfileLinks: vi.fn()
}))

const subject = sym('https://friends-test.example/profile/card#me')
const profile = subject.doc()
const firstFriend = sym('https://first-friend.example/profile/card#me')
const secondFriend = sym('https://second-friend.example/profile/card#me')

function createList (editable = true) {
  const result = createAllFriendsSection({
    dom: document,
    subject,
    profile: editable ? profile : null,
    editable,
    renderSupportingInfo: () => null,
    renderNameSuffix: () => null
  })
  document.body.appendChild(result.section)
  return result
}

function drop (target: Element, text: string, type = 'text/uri-list') {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: [type],
      getData: () => text,
      dropEffect: 'copy'
    }
  })
  target.dispatchEvent(event)
  return event
}

describe('friends list drop surface', () => {
  beforeEach(() => {
    vi.spyOn(store.updater, 'update').mockImplementation((_deletions, insertions, callback) => {
      const statements = Array.isArray(insertions) ? insertions : [insertions]
      statements.forEach(statement => store.add(statement))
      callback?.(profile.value, true, '')
    })
  })

  afterEach(() => {
    store.removeMatches(subject, null, null)
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('adds a friend when dropped onto the empty list surface', () => {
    const { friendsList } = createList()
    const surface = friendsList.querySelector('.social-friends-list-surface')!
    expect(surface).toBeVisible()
    expect(friendsList.querySelector('button[title="Drop attachments here"]')).toBeNull()

    const event = drop(surface, firstFriend.value)

    expect(event.defaultPrevented).toBe(true)
    expect(store.updater.update).toHaveBeenCalledTimes(1)
    expect(store.holds(subject, ns.foaf('knows'), firstFriend, profile)).toBe(true)
    expect(friendsList.querySelector(`a[href="${firstFriend.value}"]`)).not.toBeNull()
  })

  it('accepts drops onto existing cards and keeps working after refresh', () => {
    store.add(subject, ns.foaf('knows'), firstFriend, profile)
    const { friendsList } = createList()
    const card = friendsList.querySelector(`a[href="${firstFriend.value}"]`)!.closest('tr')!

    drop(card.querySelector('a')!, secondFriend.value)

    expect(store.updater.update).toHaveBeenCalledTimes(1)
    expect(store.holds(subject, ns.foaf('knows'), secondFriend, profile)).toBe(true)
    const refreshedCard = friendsList.querySelector(`a[href="${secondFriend.value}"]`)!.closest('tr')!
    expect(refreshedCard).not.toBeNull()
    expect(refreshedCard.querySelector('[title="Remove this friend"]')).not.toBeNull()
    drop(refreshedCard, firstFriend.value)
    expect(store.updater.update).toHaveBeenCalledTimes(2)
  })

  it('accepts multiple WebIDs and ignores URI-list comments', () => {
    const { friendsList } = createList()
    drop(friendsList.querySelector('.social-friends-drop-hint')!,
      `# Friends\r\n${firstFriend.value}\r\n${secondFriend.value}\r\n`)

    expect(store.updater.update).toHaveBeenCalledTimes(1)
    expect(store.each(subject, ns.foaf('knows'))).toHaveLength(2)
  })

  it('accepts a WebID dragged as plain text', () => {
    const { friendsList } = createList()
    drop(friendsList.querySelector('.social-friends-list-surface')!,
      firstFriend.value, 'text/plain')

    expect(store.holds(subject, ns.foaf('knows'), firstFriend, profile)).toBe(true)
  })

  it('does not enable drops or show editable controls on read-only lists', () => {
    store.add(subject, ns.foaf('knows'), firstFriend, profile)
    const { friendsList } = createList(false)
    expect(friendsList.querySelector('.social-friends-drop-hint')).toBeNull()
    expect(friendsList.querySelector('button')).toBeNull()
    expect(friendsList.querySelector('[title="Remove this friend"]')).toBeNull()
    const event = drop(friendsList.querySelector('.social-friends-list-surface')!,
      secondFriend.value)

    expect(event.defaultPrevented).toBe(false)
    expect(store.updater.update).not.toHaveBeenCalled()
    expect(store.holds(subject, ns.foaf('knows'), secondFriend)).toBe(false)
  })
})
