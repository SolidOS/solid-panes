import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPaneState,
  nextHistoryState,
  parseNavigationState,
  readNavigationState,
  viewFromPane,
  withoutPaneState
} from '../../../src/navigation/state'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('viewFromPane', () => {
  it.each([
    [undefined, undefined, { kind: 'default' }],
    ['profile', 'https://a.example/card#me', { kind: 'profile', pane: 'profile', subject: 'https://a.example/card#me' }],
    ['social', 'https://a.example/card#me', { kind: 'friends', pane: 'social', subject: 'https://a.example/card#me' }],
    ['folder', 'https://a.example/', { kind: 'storage', pane: 'folder', subject: 'https://a.example/' }],
    ['folder', undefined, { kind: 'storage', pane: 'folder' }],
    ['home', undefined, { kind: 'pane', pane: 'home' }],
    ['source', 'https://a.example/file', { kind: 'pane', pane: 'source', subject: 'https://a.example/file' }]
  ])('describes pane %s with subject %s', (pane, subject, expected) => {
    expect(viewFromPane(pane, subject)).toEqual(expected)
  })
})

describe('parseNavigationState', () => {
  it.each([null, undefined, 'text', 42, {}])('reads %j as nothing displayed', raw => {
    expect(parseNavigationState(raw)).toEqual({ view: { kind: 'default' }, viaAccountMenu: false })
  })

  it('reads the stored pane fields', () => {
    expect(parseNavigationState({ paneName: 'social', paneUri: 'https://a.example/card#me', other: 1 })).toEqual({
      view: { kind: 'friends', pane: 'social', subject: 'https://a.example/card#me' },
      viaAccountMenu: false
    })
  })

  it('ignores empty or mistyped pane fields', () => {
    expect(parseNavigationState({ paneName: '', paneUri: 'x' }).view).toEqual({ kind: 'default' })
    expect(parseNavigationState({ paneName: 'profile', paneUri: 5 }).view).toEqual({ kind: 'profile', pane: 'profile' })
  })

  it('only trusts the account-menu marker when it is exactly true', () => {
    expect(parseNavigationState({ viaAccountMenu: true }).viaAccountMenu).toBe(true)
    expect(parseNavigationState({ viaAccountMenu: 'yes' }).viaAccountMenu).toBe(false)
  })

  it('reads the current history entry', () => {
    window.history.replaceState({ paneName: 'folder', paneUri: 'https://a.example/', viaAccountMenu: true }, '', '/')

    expect(readNavigationState()).toEqual({
      view: { kind: 'storage', pane: 'folder', subject: 'https://a.example/' },
      viaAccountMenu: true
    })
  })
})

describe('nextHistoryState', () => {
  const storage = { name: 'folder', subject: 'https://a.example/' }

  it('records the displayed pane and its subject', () => {
    expect(nextHistoryState({}, { pane: storage, leavingPage: false, viaAccountMenu: false })).toEqual({
      paneName: 'folder',
      paneUri: 'https://a.example/'
    })
  })

  it('keeps other keys of the entry', () => {
    expect(nextHistoryState({ other: 'kept' }, { pane: storage, leavingPage: false, viaAccountMenu: false }))
      .toMatchObject({ other: 'kept', paneName: 'folder' })
  })

  it('treats a missing or non-object entry as empty', () => {
    for (const current of [null, undefined, 'text']) {
      expect(nextHistoryState(current, { leavingPage: false, viaAccountMenu: false })).toEqual({})
    }
  })

  it('drops a saved pane URI when the new pane has no subject of its own', () => {
    expect(nextHistoryState({ paneName: 'folder', paneUri: 'https://a.example/' }, {
      pane: { name: 'home' }, leavingPage: false, viaAccountMenu: false
    })).toEqual({ paneName: 'home' })
    expect(nextHistoryState({ paneUri: 'https://a.example/' }, {
      pane: { name: 'home', subject: '' }, leavingPage: false, viaAccountMenu: false
    })).toEqual({ paneName: 'home' })
  })

  it('keeps the pane when the same page is rendered again without one', () => {
    const current = { paneName: 'profile', paneUri: 'https://a.example/card#me' }

    expect(nextHistoryState(current, { leavingPage: false, viaAccountMenu: false })).toEqual(current)
  })

  it('does not carry pane details into the entry of a different page', () => {
    expect(nextHistoryState(
      { paneName: 'profile', paneUri: 'https://a.example/card#me', other: 'kept' },
      { leavingPage: true, viaAccountMenu: false }
    )).toEqual({ other: 'kept' })
  })

  it('records a pane for a different page', () => {
    expect(nextHistoryState({ paneName: 'profile' }, { pane: storage, leavingPage: true, viaAccountMenu: false }))
      .toEqual({ paneName: 'folder', paneUri: 'https://a.example/' })
  })

  it('marks and unmarks account-menu views', () => {
    expect(nextHistoryState({}, { pane: storage, leavingPage: false, viaAccountMenu: true }))
      .toMatchObject({ viaAccountMenu: true })
    expect(nextHistoryState({ viaAccountMenu: true }, { pane: storage, leavingPage: false, viaAccountMenu: false }))
      .not.toHaveProperty('viaAccountMenu')
  })

  it('does not change the entry it was given', () => {
    const current = { paneName: 'profile', viaAccountMenu: true }

    nextHistoryState(current, { leavingPage: true, viaAccountMenu: false })

    expect(current).toEqual({ paneName: 'profile', viaAccountMenu: true })
  })
})

describe('forgetting the displayed pane', () => {
  it('removes only the pane fields', () => {
    expect(withoutPaneState({ paneName: 'x', paneUri: 'y', viaAccountMenu: true, other: 'kept' })).toEqual({ other: 'kept' })
    expect(withoutPaneState(null)).toEqual({})
  })

  it('clears them from the current entry without changing the URL', () => {
    window.history.replaceState({ paneName: 'folder', paneUri: 'https://a.example/', viaAccountMenu: true, other: 1 }, '', '/some/page')

    clearPaneState()

    expect(window.history.state).toEqual({ other: 1 })
    expect(window.location.pathname).toBe('/some/page')
    expect(readNavigationState()).toEqual({ view: { kind: 'default' }, viaAccountMenu: false })
  })
})
