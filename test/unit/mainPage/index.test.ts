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
  refreshProfileHeading: refreshHeading
}))
vi.mock('../../../src/utils/paneUtils', () => ({
  getProfilePaneFromURI: getProfilePane,
  getSocialPaneFromURI: getSocialPane,
  getFolderPaneForStorage: getFolderPane
}))
vi.mock('../../../src/utils/webIdUtils', () => ({ isWebIdUri: isWebId }))

import { initMainPage, refreshUI } from '../../../src/mainPage'

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
  const GotoSubject = vi.fn((_subject, _expand, pane, _solo, _referrer, _table, showNavbar = true) => {
    const next = { ...window.history.state }
    if (pane) {
      next.paneName = pane.name
      if (pane.subject) next.paneUri = pane.subject.value
    }
    if (showNavbar) delete next.viaAccountMenu
    else next.viaAccountMenu = true
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

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href))
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

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href))
    expect(byName).not.toHaveBeenCalled()
    expect(getSocialPane).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
    expect(window.history.state).toEqual({
      paneName: 'profile',
      paneUri: urlProfilePane.subject.value,
      other: 'kept'
    })
  })

  it('still restores the pane selected on a non-WebID page', async () => {
    const storagePane = { name: 'folder', paneName: 'folder', subject: store.sym(`${origin}/other/storage/`) }
    getFolderPane.mockResolvedValue(storagePane)
    const GotoSubject = setup({ paneName: 'folder', paneUri: `${origin}/other/storage/` }, false)

    await initMainPage(store)

    expect(getFolderPane).toHaveBeenCalledWith(store.sym(`${origin}/other/storage/`))
    expect(getProfilePane).not.toHaveBeenCalled()
    expect(GotoSubject.mock.calls[0][2]).toBe(storagePane)
    expect(window.history.state.paneUri).toBe(`${origin}/other/storage/`)
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
  async function setupLoaded (state: object = {}) {
    const GotoSubject = setup(state)
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

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href))
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
    expect(GotoSubject.mock.calls[0][6]).toBe(true)
    expect(selectNavbarPane).toHaveBeenCalledWith('profile', urlProfilePane.subject.value)
    expect(window.history.state).toEqual({ paneName: 'profile', paneUri: urlProfilePane.subject.value })
    expect(refreshHeading).toHaveBeenCalledWith(true)
  })

  it('restores an account-menu storage entry on back or forward and hides the navbar', async () => {
    const GotoSubject = await setupLoaded()
    const navbar = document.createElement('solid-panes-navbar')
    document.body.appendChild(navbar)
    const storage = `${origin}/storage/`
    const storagePane = { name: 'folder', paneName: 'folder', subject: store.sym(storage) }
    getFolderPane.mockResolvedValue(storagePane)
    window.history.replaceState({ paneName: 'folder', paneUri: storage, viaAccountMenu: true }, '', window.location.href)

    traverse()
    await vi.waitFor(() => expect(refreshHeading).toHaveBeenCalledWith(false))

    expect(getFolderPane).toHaveBeenCalledWith(store.sym(storage))
    const [subject, , pane, , , , showNavbar] = GotoSubject.mock.calls[0]
    expect(subject.value).toBe(window.location.href)
    expect(pane).toBe(storagePane)
    expect(showNavbar).toBe(false)
    expect(navbar).toHaveClass('navbar--hidden')
    expect(selectNavbarPane).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/other/profile/card')
  })

  it('restores a navbar entry on back or forward and selects it in the navbar', async () => {
    const GotoSubject = await setupLoaded()
    const webId = urlProfilePane.subject.value
    const socialPane = { name: 'social', paneName: 'social', subject: urlProfilePane.subject }
    getSocialPane.mockResolvedValue(socialPane)
    window.history.replaceState({ paneName: 'social', paneUri: webId }, '', window.location.href)

    traverse()
    await vi.waitFor(() => expect(refreshHeading).toHaveBeenCalledWith(false))

    expect(getSocialPane).toHaveBeenCalledWith(store.sym(webId))
    expect(GotoSubject.mock.calls[0][2]).toBe(socialPane)
    expect(GotoSubject.mock.calls[0][6]).toBe(true)
    expect(selectNavbarPane).toHaveBeenCalledWith('social', webId)
  })

  it('shows the URL\'s profile when the history entry has no saved pane', async () => {
    const GotoSubject = await setupLoaded({ paneName: 'social', paneUri: urlProfilePane.subject.value })
    window.history.replaceState({}, '', window.location.href)

    traverse()
    await vi.waitFor(() => expect(refreshHeading).toHaveBeenCalledWith(false))

    expect(getProfilePane).toHaveBeenCalledWith(store.sym(window.location.href))
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
    expect(selectNavbarPane).toHaveBeenCalledWith('profile', urlProfilePane.subject.value)
  })

  it('ignores entry changes that are not back or forward', async () => {
    const GotoSubject = await setupLoaded()

    traverse('replace')
    traverse('push')
    await Promise.resolve()

    expect(GotoSubject).not.toHaveBeenCalled()
  })

  it('only renders the latest entry when navigating quickly', async () => {
    const GotoSubject = await setupLoaded()
    const webId = urlProfilePane.subject.value
    let resolveFirst!: (pane: unknown) => void
    getSocialPane.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
    window.history.replaceState({ paneName: 'social', paneUri: webId }, '', window.location.href)
    traverse()
    await vi.waitFor(() => expect(getSocialPane).toHaveBeenCalled())

    window.history.replaceState({}, '', window.location.href)
    traverse()
    await vi.waitFor(() => expect(GotoSubject).toHaveBeenCalledOnce())
    resolveFirst({ name: 'social', paneName: 'social', subject: urlProfilePane.subject })
    await new Promise(resolve => setTimeout(resolve))

    expect(GotoSubject).toHaveBeenCalledOnce()
    expect(GotoSubject.mock.calls[0][2]).toBe(urlProfilePane)
  })

  it('renders after the page\'s own popstate handlers so the restored entry wins', async () => {
    const GotoSubject = await setupLoaded()
    const storage = `${origin}/storage/`
    getFolderPane.mockResolvedValue({ name: 'folder', paneName: 'folder', subject: store.sym(storage) })
    window.history.replaceState({ paneName: 'folder', paneUri: storage, viaAccountMenu: true }, '', window.location.href)
    let handlersFinished = false
    // mashlib's own handler re-renders the default pane, dropping the marker from the entry
    window.addEventListener('popstate', () => {
      window.history.replaceState({ paneName: 'folder', paneUri: storage }, '', window.location.href)
      handlersFinished = true
    }, { once: true })
    GotoSubject.mockImplementationOnce(() => { expect(handlersFinished).toBe(true) })

    traverse()
    window.dispatchEvent(new PopStateEvent('popstate'))
    await vi.waitFor(() => expect(GotoSubject).toHaveBeenCalledOnce())
    expect(GotoSubject.mock.calls[0][6]).toBe(false)
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

    const [subject, , pane, , , , showNavbar] = GotoSubject.mock.calls[0]
    expect(subject.value).toBe(pageUrl)
    expect(pane).toBe(storagePane)
    expect(showNavbar).toBe(false)
    expect(window.location.href).toBe(pageUrl)
    expect(window.history.state).toMatchObject({ paneName: 'folder', paneUri: storage, viaAccountMenu: true })
    expect(navbar).toHaveClass('navbar--hidden')

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
