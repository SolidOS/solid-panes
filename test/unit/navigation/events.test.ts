import { afterEach, describe, expect, it, vi } from 'vitest'
import { announceNavigation, NAVIGATED_EVENT, onNavigated, type NavigatedDetail } from '../../../src/navigation/events'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('navigation events', () => {
  it('announces the page URL and what the entry displays', () => {
    window.history.replaceState({ paneName: 'folder', paneUri: 'https://a.example/', viaAccountMenu: true }, '', '/some/page')
    const seen: NavigatedDetail[] = []
    document.addEventListener(NAVIGATED_EVENT, event => seen.push((event as CustomEvent<NavigatedDetail>).detail), { once: true })

    announceNavigation(document)

    expect(seen).toEqual([{
      url: `${window.location.origin}/some/page`,
      state: { view: { kind: 'storage', pane: 'folder', subject: 'https://a.example/' }, viaAccountMenu: true }
    }])
  })

  it('announces an entry that displays nothing in particular', () => {
    const listener = vi.fn()
    const stop = onNavigated(listener)

    announceNavigation(document)

    expect(listener).toHaveBeenCalledWith({
      url: window.location.href,
      state: { view: { kind: 'default' }, viaAccountMenu: false }
    })
    stop()
  })

  it('stops calling a listener once it has been removed', () => {
    const listener = vi.fn()
    const stop = onNavigated(listener)

    announceNavigation(document)
    stop()
    announceNavigation(document)

    expect(listener).toHaveBeenCalledOnce()
  })
})
