import { afterEach, describe, expect, it, vi } from 'vitest'
import { store } from 'solid-logic'

const {
  getOutliner, byName, getProfilePane, getSocialPane, getFolderPane, refreshHeading, selectNavbarPane, isWebId
} = vi.hoisted(() => ({
  getOutliner: vi.fn(),
  byName: vi.fn(),
  getProfilePane: vi.fn(),
  getSocialPane: vi.fn(),
  getFolderPane: vi.fn(),
  refreshHeading: vi.fn(),
  selectNavbarPane: vi.fn(),
  isWebId: vi.fn()
}))

vi.mock('../../../src/index', () => ({ getOutliner }))
vi.mock('pane-registry', () => ({ byName }))
vi.mock('../../../src/mainPage/header', () => ({ createHeader: vi.fn() }))
vi.mock('../../../src/mainPage/navbar', () => ({ createNavbar: vi.fn(), selectNavbarPane }))
vi.mock('../../../src/mainPage/profileHeading', () => ({
  initializeProfileHeading: vi.fn(),
  placeProfileHeading: vi.fn(),
  refreshProfileHeading: refreshHeading
}))
vi.mock('../../../src/utils/paneUtils', () => ({
  getProfilePaneFromURI: getProfilePane,
  getSocialPaneFromURI: getSocialPane,
  getFolderPaneForStorage: getFolderPane
}))
vi.mock('../../../src/utils/webIdUtils', () => ({ isWebIdUri: isWebId }))

import { initMainPage, refreshUI } from '../../../src/mainPage'
import { resolveSource } from '../../../src/navigation/options'

const navigationListeners: Record<string, (event: unknown) => void> = {}
Object.defineProperty(window, 'navigation', {
  configurable: true,
  value: {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      navigationListeners[type] = listener
    }
  }
})

afterEach(() => {
  vi.resetAllMocks()
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

const origin = window.location.origin
const environment = {
  layout: 'desktop',
  layoutPreference: 'auto',
  theme: 'light',
  inputMode: 'pointer',
  viewport: { width: 1280, height: 800 }
}
const urlProfilePane = {
  name: 'profile',
  paneName: 'profile',
  subject: store.sym('https://other.example/profile/card#me')
}

function setup (state: object, webId = true) {
  // Mirrors how the outline manager records the displayed pane in history.state
  const GotoSubject = vi.fn((_subject, _expand, pane, _solo, _referrer, _table, options) => {
    const next = { ...window.history.state }
    if (pane) {
      next.paneName = pane.name
      if (pane.subject) next.paneUri = pane.subject.value
    }
    if (resolveSource(options) === 'accountMenu') next.viaAccountMenu = true
    else delete next.viaAccountMenu
    window.history.replaceState(next, '', window.location.href)
  })
  getOutliner.mockReturnValue({ GotoSubject })
  getProfilePane.mockResolvedValue(urlProfilePane)
  byName.mockReturnValue({ name: 'folder' })
  isWebId.mockReturnValue(webId)
  window.history.replaceState(state, '', webId ? '/other/profile/card#me' : '/other/storage/file.ttl')
  return GotoSubject
}

describe('main page load', () => {
  it('loads the URL\'s profile instead of the pane the account menu showed', async () => {
    const GotoSubject = setup({
      paneName: 'folder',
      paneUri: `${origin}/storage/`,
      viaAccountMenu: true,
      other: 'kept'
    })

    await initMainPage(store)

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href), byName)
    expect(byName).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
    expect(window.location.pathname).toBe('/other/profile/card')
  })

  it.each([
    ['social', 'https://other.example/profile/card#me'],
    ['folder', 'https://other.example/storage/']
  ])('always shows the profile when a WebID is reloaded after the %s pane was selected', async (paneName, paneUri) => {
    const GotoSubject = setup({ paneName, paneUri, other: 'kept' })

    await initMainPage(store)

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href), byName)
    expect(byName).not.toHaveBeenCalled()
    expect(getSocialPane).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
    expect(window.history.state).toEqual({
      paneName: 'profile',
      paneUri: urlProfilePane.subject.value,
      other: 'kept'
    })
  })

  it.each([
    ['a storage from the navbar', { paneName: 'folder', paneUri: `${origin}/other/storage/` }],
    ['friends from the navbar', { paneName: 'social', paneUri: `${origin}/other/profile/card#me` }],
    ['a pane of the application', { paneName: 'home' }]
  ])('shows what the URL is on a reload, whatever pane was selected before: %s', async (_name, saved) => {
    const GotoSubject = setup({ ...saved, other: 'kept' }, false)

    await initMainPage(store)

    expect(getFolderPane).not.toHaveBeenCalled()
    expect(getSocialPane).not.toHaveBeenCalled()
    expect(byName).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBeUndefined()
    expect(window.history.state).toEqual({ other: 'kept' })
  })

  it('drops account-menu content on a non-WebID page', async () => {
    const GotoSubject = setup({
      paneName: 'folder',
      paneUri: `${origin}/storage/`,
      viaAccountMenu: true
    }, false)

    await initMainPage(store)

    expect(byName).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBeUndefined()
    expect(window.history.state).toEqual({})
  })
})

describe('browser navigation without a reload', () => {
  async function setupLoaded (state: object = {}, webId = true) {
    const GotoSubject = setup(state, webId)
    await initMainPage(store)
    GotoSubject.mockClear()
    refreshHeading.mockClear()
    getProfilePane.mockClear()
    selectNavbarPane.mockClear()
    return GotoSubject
  }

  function enter (overrides: object = {}) {
    const intercept = vi.fn()
    navigationListeners.navigate({
      canIntercept: true,
      userInitiated: true,
      navigationType: 'replace',
      destination: { url: window.location.href },
      intercept,
      ...overrides
    })
    return intercept
  }

  function traverse (navigationType = 'traverse') {
    navigationListeners.currententrychange({ navigationType })
  }

  it('shows the URL\'s profile, navbar selection and heading when Enter is pressed on the current URL', async () => {
    const GotoSubject = await setupLoaded()
    window.history.replaceState({
      paneName: 'folder',
      paneUri: `${origin}/storage/`,
      viaAccountMenu: true
    }, '', window.location.href)

    for (const overrides of [
      { userInitiated: false },
      { navigationType: 'push' },
      { canIntercept: false },
      { destination: { url: `${origin}/elsewhere` } }
    ]) {
      expect(enter(overrides)).not.toHaveBeenCalled()
    }

    const intercept = enter()
    expect(intercept).toHaveBeenCalledOnce()
    await intercept.mock.calls[0][0].handler()

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href), byName)
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
    expect(resolveSource(GotoSubject.mock.calls[0][6])).toBe('default')
    expect(selectNavbarPane).toHaveBeenCalledWith('profile', urlProfilePane.subject.value)
    expect(window.history.state).toEqual({ paneName: 'profile', paneUri: urlProfilePane.subject.value })
    expect(refreshHeading).toHaveBeenCalledWith(true)
  })

  it('shows a container\'s own default view when Enter is pressed on its URL after a storage was selected', async () => {
    const GotoSubject = await setupLoaded({}, false)
    window.history.replaceState({ paneName: 'folder', paneUri: `${origin}/other/` }, '', window.location.href)

    const intercept = enter()
    expect(intercept).toHaveBeenCalledOnce()
    await intercept.mock.calls[0][0].handler()

    expect(getFolderPane).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBeUndefined()
    expect(window.history.state).toEqual({})
    expect(selectNavbarPane).not.toHaveBeenCalled()
    expect(refreshHeading).toHaveBeenCalledWith(true)
  })

  it.each([
    ['an account-menu storage', { paneName: 'folder', paneUri: `${origin}/storage/`, viaAccountMenu: true }],
    ['a storage from the navbar', { paneName: 'folder', paneUri: `${origin}/other/storage/` }],
    ['friends from the navbar', { paneName: 'social', paneUri: `${origin}/other/profile/card#me` }],
    ['an account-menu dashboard', { paneName: 'home', viaAccountMenu: true }]
  ])('shows what the URL is on back or forward, not %s the entry displayed', async (_name, saved) => {
    const GotoSubject = await setupLoaded()
    window.history.replaceState({ ...saved, other: 'kept' }, '', window.location.href)

    traverse()
    await vi.waitFor(() => expect(refreshHeading).toHaveBeenCalledWith(true))

    expect(getFolderPane).not.toHaveBeenCalled()
    expect(getSocialPane).not.toHaveBeenCalled()
    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href), byName)
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
    expect(resolveSource(GotoSubject.mock.calls[0][6])).toBe('default')
    expect(selectNavbarPane).toHaveBeenCalledWith('profile', urlProfilePane.subject.value)
    expect(window.history.state).toEqual({
      paneName: 'profile',
      paneUri: urlProfilePane.subject.value,
      other: 'kept'
    })
    expect(window.location.pathname).toBe('/other/profile/card')
  })

  it('shows a container\'s own default view on back or forward after a storage was selected', async () => {
    const GotoSubject = await setupLoaded({}, false)
    window.history.replaceState({ paneName: 'folder', paneUri: `${origin}/other/` }, '', window.location.href)

    traverse()
    await vi.waitFor(() => expect(refreshHeading).toHaveBeenCalledWith(true))

    expect(getFolderPane).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBeUndefined()
    expect(window.history.state).toEqual({})
    expect(selectNavbarPane).not.toHaveBeenCalled()
  })

  it('ignores entry changes that are not back or forward', async () => {
    const GotoSubject = await setupLoaded()

    traverse('replace')
    traverse('push')
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(GotoSubject).not.toHaveBeenCalled()
  })

  it('only renders the latest when navigating quickly', async () => {
    const GotoSubject = await setupLoaded()
    let resolveFirst!: (pane: unknown) => void
    getProfilePane.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
    traverse()
    await vi.waitFor(() => expect(getProfilePane).toHaveBeenCalledOnce())

    traverse()
    await vi.waitFor(() => expect(GotoSubject).toHaveBeenCalledOnce())
    resolveFirst({ name: 'profile', paneName: 'profile', subject: urlProfilePane.subject })
    await new Promise(resolve => setTimeout(resolve))

    expect(GotoSubject).toHaveBeenCalledOnce()
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
  })

  it('keeps the URL and account-menu view when the render environment changes', async () => {
    const GotoSubject = await setupLoaded()
    const navbar = document.createElement('solid-panes-navbar')
    document.body.appendChild(navbar)
    const storage = `${origin}/storage/`
    const storagePane = { name: 'folder', paneName: 'folder', subject: store.sym(storage) }
    getFolderPane.mockResolvedValue(storagePane)
    window.history.replaceState({ paneName: 'folder', paneUri: storage, viaAccountMenu: true }, '', window.location.href)
    const pageUrl = window.location.href
    const outliner = getOutliner()
    outliner.context = { session: { store }, environment: { ...environment, layout: 'mobile' } }

    await refreshUI(outliner)

    const [subject, , pane, , , , options] = GotoSubject.mock.calls[0]
    expect(subject.value).toBe(pageUrl)
    expect(pane).toBe(storagePane)
    expect(options).toEqual({ source: 'accountMenu', folderView: 'explorer' })
    expect(window.location.href).toBe(pageUrl)
    expect(window.history.state).toMatchObject({ paneName: 'folder', paneUri: storage, viaAccountMenu: true })
    expect(navbar).toHaveClass('navbar--hidden')

    await refreshUI(outliner)
    expect(GotoSubject).toHaveBeenCalledOnce()
  })

  it('refreshes when the viewport changes within the same layout', async () => {
    const GotoSubject = await setupLoaded()
    const outliner = getOutliner()
    outliner.context = {
      session: { store },
      environment: { ...environment, viewport: { width: 1279, height: 800 } }
    }

    await refreshUI(outliner)

    expect(GotoSubject).toHaveBeenCalledOnce()
  })

  it('falls back to popstate when the Navigation API is unavailable', async () => {
    Reflect.deleteProperty(window, 'navigation')
    vi.resetModules()
    const { initMainPage: initWithoutNavigationApi } = await import('../../../src/mainPage')
    const GotoSubject = setup({})
    await initWithoutNavigationApi(store)
    GotoSubject.mockClear()
    window.history.replaceState({}, '', window.location.href)

    window.dispatchEvent(new PopStateEvent('popstate'))
    await vi.waitFor(() => expect(GotoSubject).toHaveBeenCalledOnce())
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
  })
})
