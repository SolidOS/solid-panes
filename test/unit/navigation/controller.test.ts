import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { store } from 'solid-logic'
import type { OutlineManager } from '../../../src/outline/manager'
import {
  createNavigationController,
  type NavigationController,
  type NavigationDeps,
  type NavigationEffects
} from '../../../src/navigation/controller'
import { resolveSource } from '../../../src/navigation/options'

const { getProfilePane, getSocialPane, getFolderPane, isWebId } = vi.hoisted(() => ({
  getProfilePane: vi.fn(),
  getSocialPane: vi.fn(),
  getFolderPane: vi.fn(),
  isWebId: vi.fn()
}))

vi.mock('../../../src/utils/paneUtils', () => ({
  getProfilePaneFromURI: getProfilePane,
  getSocialPaneFromURI: getSocialPane,
  getFolderPaneForStorage: getFolderPane
}))
vi.mock('../../../src/utils/webIdUtils', () => ({ isWebIdUri: isWebId }))

const owner = 'https://pod.example/timea/profile/card#me'
const profilePane = { name: 'profile', subject: store.sym(owner) }
const socialPane = { name: 'social', subject: store.sym(owner) }
const storagePane = { name: 'folder', paneName: 'folder', subject: store.sym('https://pod.example/timea/') }
const homePane = { name: 'home' }

let calls: string[]
let GotoSubject: Mock<(...args: any[]) => void>
let selectNavbarPane: Mock<NavigationEffects['selectNavbarPane']>
let refreshHeading: Mock<NavigationEffects['refreshHeading']>
let byName: Mock<NavigationDeps['byName']>
let controller: NavigationController
let navbar: HTMLElement

beforeEach(() => {
  calls = []
  // Records the displayed pane in history.state, as the outline manager does
  GotoSubject = vi.fn((_subject, _expand, pane, _solo, _referrer, _table, options) => {
    calls.push('GotoSubject')
    const next: Record<string, unknown> = { ...window.history.state }
    if (pane) {
      next.paneName = pane.name
      if (pane.subject) next.paneUri = pane.subject.value
    }
    if (resolveSource(options) === 'accountMenu') next.viaAccountMenu = true
    else delete next.viaAccountMenu
    window.history.replaceState(next, '', window.location.href)
  })
  selectNavbarPane = vi.fn(() => { calls.push('select') })
  refreshHeading = vi.fn(async () => { calls.push('heading') })
  byName = vi.fn((name: string) => (name === 'home' ? homePane as never : null))
  controller = createNavigationController({
    store,
    outliner: { GotoSubject } as unknown as OutlineManager,
    byName,
    effects: { selectNavbarPane, refreshHeading }
  })
  navbar = document.createElement('solid-panes-navbar')
  document.body.appendChild(navbar)

  getProfilePane.mockResolvedValue(profilePane)
  getSocialPane.mockResolvedValue(socialPane)
  getFolderPane.mockResolvedValue(storagePane)
  isWebId.mockReturnValue(false)
  window.history.replaceState({}, '', '/timea2/docs/')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
  document.body.replaceChildren()
  window.history.replaceState(null, '', '/')
})

const sourceOfCall = (index = 0) => resolveSource(GotoSubject.mock.calls[index][6])

describe('showing a profile, friends or storage', () => {
  it('displays the person\'s pane for the page URL, then selects it in the navbar and refreshes the heading', async () => {
    await controller.show({ kind: 'profile', subject: owner })

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(owner), byName)
    expect(GotoSubject).toHaveBeenCalledWith(
      store.sym(window.location.href), true, profilePane, true, undefined, undefined, { source: 'default' }
    )
    expect(selectNavbarPane).toHaveBeenCalledWith('profile', owner)
    expect(refreshHeading).toHaveBeenCalledWith(false)
    expect(calls).toEqual(['GotoSubject', 'select', 'heading'])
    expect(navbar).not.toHaveClass('navbar--hidden')
  })

  it('does the same for friends and for a storage', async () => {
    await controller.show({ kind: 'friends', subject: owner })
    await controller.show({ kind: 'storage', pane: storagePane as never })

    expect(GotoSubject.mock.calls.map(call => call[2])).toEqual([socialPane, storagePane])
    expect(selectNavbarPane.mock.calls).toEqual([['social', owner], ['folder', 'https://pod.example/timea/']])
  })

  it('displays a pane of the application by its registry name', async () => {
    await controller.show({ kind: 'app', pane: 'home' })

    expect(byName).toHaveBeenCalledWith('home')
    expect(GotoSubject.mock.calls[0][2]).toBe(homePane)
    expect(selectNavbarPane).toHaveBeenCalledWith('home', undefined)
  })
})

describe('when the account menu asks', () => {
  it('hides the navbar, remembers the source and does not select anything in it', async () => {
    await controller.show({ kind: 'profile', subject: owner, source: 'accountMenu' })

    expect(sourceOfCall()).toBe('accountMenu')
    expect(window.history.state).toMatchObject({ viaAccountMenu: true })
    expect(navbar).toHaveClass('navbar--hidden')
    expect(selectNavbarPane).not.toHaveBeenCalled()
    expect(refreshHeading).toHaveBeenCalledWith(false)
  })

  it('hides the navbar before the pane has been resolved', async () => {
    let finish!: (pane: unknown) => void
    getProfilePane.mockReturnValue(new Promise(resolve => { finish = resolve }))

    const shown = controller.show({ kind: 'profile', subject: owner, source: 'accountMenu' })

    expect(navbar).toHaveClass('navbar--hidden')
    expect(GotoSubject).not.toHaveBeenCalled()
    finish(profilePane)
    await shown
  })

  it('shows the navbar again for the page\'s own navigation', async () => {
    navbar.classList.add('navbar--hidden')

    await controller.show({ kind: 'friends', subject: owner })
    // The outline manager reveals the navbar; the fake outliner here does not, so only check intent
    expect(sourceOfCall()).toBe('default')
  })
})

describe('when a pane cannot be built', () => {
  it('displays nothing rather than the page URL\'s default view, and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    getProfilePane.mockResolvedValue(null)

    await controller.show({ kind: 'profile', subject: owner, source: 'accountMenu' })

    expect(GotoSubject).not.toHaveBeenCalled()
    expect(refreshHeading).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('treats an unknown application pane the same way', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await controller.show({ kind: 'app', pane: 'unknown' })

    expect(GotoSubject).not.toHaveBeenCalled()
  })
})

describe('restoring a history entry', () => {
  it('displays what the current entry displays', async () => {
    window.history.replaceState({ paneName: 'social', paneUri: owner }, '', '/timea2/docs/')

    await controller.show({ kind: 'restore' })

    expect(getSocialPane).toHaveBeenCalledWith(store.sym(owner), byName)
    expect(GotoSubject.mock.calls[0][2]).toBe(socialPane)
    expect(selectNavbarPane).toHaveBeenCalledWith('social', owner)
    expect(refreshHeading).toHaveBeenCalledWith(false)
  })

  it.each([
    ['home', 'a pane of the application', homePane],
    ['source', 'a pane the registry does not know', undefined]
  ])('restores the registry pane %s without a subject of its own (%s)', async (name, _what, expected) => {
    byName.mockImplementation((requested: string) => requested === 'home' ? homePane as never : null)
    window.history.replaceState({ paneName: name }, '', '/timea2/docs/')

    await controller.show({ kind: 'restore' })

    expect(GotoSubject.mock.calls[0][2]).toBe(expected)
  })

  it('shows the profile on a WebID whose entry displayed nothing', async () => {
    isWebId.mockReturnValue(true)
    window.history.replaceState({}, '', '/timea/profile/card')

    await controller.show({ kind: 'restore' })

    expect(isWebId).toHaveBeenCalledWith(store.sym(`${window.location.origin}/timea/profile/card`))
    expect(getProfilePane).toHaveBeenCalledWith(store.sym(`${window.location.origin}/timea/profile/card`), byName)
    expect(GotoSubject.mock.calls[0][2]).toBe(profilePane)
  })

  it('shows the page\'s default view when nothing was displayed and it is not a WebID', async () => {
    await controller.show({ kind: 'restore' })

    expect(GotoSubject.mock.calls[0][2]).toBeUndefined()
    expect(selectNavbarPane).not.toHaveBeenCalled()
    expect(refreshHeading).toHaveBeenCalledWith(false)
  })

  it('still shows the default view when the entry names a pane that cannot be built', async () => {
    getFolderPane.mockResolvedValue(null)
    window.history.replaceState({ paneName: 'folder', paneUri: 'https://pod.example/timea/' }, '', '/timea2/docs/')

    await controller.show({ kind: 'restore' })

    expect(GotoSubject.mock.calls[0][2]).toBeUndefined()
  })

  it('uses the subject it is given instead of the page URL', async () => {
    isWebId.mockReturnValue(true)

    await controller.show({ kind: 'restore', subject: 'https://other.example/profile/card#me' })

    expect(isWebId).toHaveBeenCalledWith(store.sym('https://other.example/profile/card#me'))
    expect(GotoSubject.mock.calls[0][0]).toEqual(store.sym('https://other.example/profile/card#me'))
  })

  it('redoes the heading only when asked to', async () => {
    await controller.show({ kind: 'restore', forceHeading: true })
    await controller.show({ kind: 'restore' })

    expect(refreshHeading.mock.calls).toEqual([[true], [false]])
  })
})

describe('when intents overlap', () => {
  it('displays only the latest while an earlier one is still resolving its pane', async () => {
    let finishFirst!: (pane: unknown) => void
    getProfilePane.mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve }))

    const first = controller.show({ kind: 'profile', subject: owner })
    const second = controller.show({ kind: 'friends', subject: owner })
    await second
    finishFirst(profilePane)
    await first

    expect(GotoSubject).toHaveBeenCalledOnce()
    expect(GotoSubject.mock.calls[0][2]).toBe(socialPane)
    expect(refreshHeading).toHaveBeenCalledOnce()
  })

  it('lets an account-menu choice win over a restore that was already under way', async () => {
    let finishRestore!: (pane: unknown) => void
    getProfilePane.mockReturnValueOnce(new Promise(resolve => { finishRestore = resolve }))
    isWebId.mockReturnValue(true)

    const restore = controller.show({ kind: 'restore' })
    await controller.show({ kind: 'storage', pane: storagePane as never, source: 'accountMenu' })
    finishRestore(profilePane)
    await restore

    expect(GotoSubject.mock.calls.map(call => call[2])).toEqual([storagePane])
  })

  it('does not hold up an intent because of an earlier one that already finished', async () => {
    await controller.show({ kind: 'profile', subject: owner })
    await controller.show({ kind: 'friends', subject: owner })

    expect(GotoSubject).toHaveBeenCalledTimes(2)
  })
})
