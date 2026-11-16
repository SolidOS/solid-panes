import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NavigationController } from '../../../src/navigation/controller'

type Listener = (event: unknown) => void

const listeners: Record<string, Listener> = {}
let show: ReturnType<typeof vi.fn>
let controller: NavigationController

function defineNavigationApi () {
  Object.defineProperty(window, 'navigation', {
    configurable: true,
    value: { addEventListener: (type: string, listener: Listener) => { listeners[type] = listener } }
  })
}

// The module keeps the listeners it added, so each test starts from a fresh copy of it
async function freshModule () {
  vi.resetModules()
  return import('../../../src/navigation/browserEvents')
}

// Enter on a URL ending in #me is a fragment navigation to the same URL
function enter (overrides: object = {}) {
  const intercept = vi.fn()
  listeners.navigate({
    canIntercept: true,
    userInitiated: true,
    navigationType: 'replace',
    hashChange: true,
    destination: { url: window.location.href, sameDocument: true },
    intercept,
    ...overrides
  })
  return intercept
}

// What Safari dispatches for history.replaceState during a tap
function historyWrite (intercept: ReturnType<typeof vi.fn>) {
  listeners.navigate({
    canIntercept: true,
    userInitiated: true,
    navigationType: 'replace',
    hashChange: false,
    destination: { url: window.location.href, sameDocument: true },
    intercept
  })
}

const traverse = (navigationType = 'traverse') => listeners.currententrychange({ navigationType })
const nextTask = () => new Promise(resolve => setTimeout(resolve, 5))

beforeEach(() => {
  for (const key of Object.keys(listeners)) delete listeners[key]
  show = vi.fn().mockResolvedValue(undefined)
  controller = { show } as unknown as NavigationController
  defineNavigationApi()
  window.history.replaceState({ paneName: 'folder', paneUri: 'https://pod.example/', viaAccountMenu: true, other: 'kept' }, '', '/page')
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'navigation')
  window.history.replaceState(null, '', '/')
})

describe('Enter on the current URL', () => {
  it('shows what the URL is, after forgetting what the entry displayed', async () => {
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)

    const intercept = enter()
    expect(intercept).toHaveBeenCalledOnce()
    expect(intercept.mock.calls[0][0]).toMatchObject({ scroll: 'manual', focusReset: 'manual' })
    await intercept.mock.calls[0][0].handler()

    expect(window.history.state).toEqual({ other: 'kept' })
    expect(show).toHaveBeenCalledWith({ kind: 'restore', forceHeading: true })
  })

  it('also handles Enter on a URL without a fragment, which is a cross-document navigation', async () => {
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)

    expect(enter({ hashChange: false, destination: { url: window.location.href, sameDocument: false } })).toHaveBeenCalledOnce()
  })

  it.each([
    ['not started by the user', { userInitiated: false }],
    ['not a replacement of the entry', { navigationType: 'push' }],
    ['one that cannot be intercepted', { canIntercept: false }],
    ['to another URL', { destination: { url: 'https://elsewhere.example/', sameDocument: false } }],
    ['a history API write', { hashChange: false }],
    ['a history API write with same-document metadata omitted', {
      hashChange: false,
      destination: { url: window.location.href, sameDocument: undefined }
    }]
  ])('leaves a navigation alone when it is %s', async (_name, overrides) => {
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)

    expect(enter(overrides)).not.toHaveBeenCalled()
    expect(show).not.toHaveBeenCalled()
    expect(window.history.state).toMatchObject({ paneName: 'folder' })
  })
})

describe('application history writes in Safari', () => {
  it('keeps a storage selection when replaceState dispatches a user-initiated navigate event', async () => {
    const { registerBrowserNavigation } = await freshModule()
    const { default: OutlineManager } = await import('../../../src/outline/manager')
    const { sym } = await import('rdflib')
    registerBrowserNavigation(controller)
    window.history.replaceState({}, '', '/other/profile/card#me')

    const original = window.history.replaceState.bind(window.history)
    const intercept = vi.fn()
    const replace = vi.spyOn(window.history, 'replaceState').mockImplementation((state, title, url) => {
      historyWrite(intercept)
      original(state, title, url)
    })
    const subject = sym(window.location.href)
    const storage = sym(`${window.location.origin}/other/`)
    const manager = new OutlineManager({ dom: document, session: { paneRegistry: { list: [], byName: () => undefined } } })

    manager.GotoSubject(subject, false, { name: 'folder', subject: storage }, true)

    expect(replace).toHaveBeenCalledOnce()
    expect(intercept).not.toHaveBeenCalled()
    expect(show).not.toHaveBeenCalled()
    expect(window.history.state).toMatchObject({ paneName: 'folder', paneUri: storage.uri })
    expect(window.location.href).toBe(subject.uri)
    document.body.replaceChildren()
  }, 15_000)

  it('does not re-intercept the history write while handling address-bar navigation', async () => {
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)
    const original = window.history.replaceState.bind(window.history)
    const nestedIntercept = vi.fn()
    vi.spyOn(window.history, 'replaceState').mockImplementation((state, title, url) => {
      historyWrite(nestedIntercept)
      original(state, title, url)
    })

    await enter().mock.calls[0][0].handler()

    expect(nestedIntercept).not.toHaveBeenCalled()
    expect(window.history.state).toEqual({ other: 'kept' })
    expect(show).toHaveBeenCalledOnce()
  })

  it('keeps the account-menu profile when Safari dispatches the write after it has returned', async () => {
    const { registerBrowserNavigation } = await freshModule()
    const { writeNavigationHistory } = await import('../../../src/navigation/state')
    registerBrowserNavigation(controller)
    const profileState = { paneName: 'profile', paneUri: 'https://pod.example/profile/card#me', viaAccountMenu: true }
    const intercept = vi.fn()

    writeNavigationHistory(window.history, 'replaceState', profileState, '')
    historyWrite(intercept)

    expect(intercept).not.toHaveBeenCalled()
    expect(show).not.toHaveBeenCalled()
    expect(window.history.state).toEqual(profileState)
  })

  it('clears the write guard even if history throws', async () => {
    const { registerBrowserNavigation } = await freshModule()
    const { writeNavigationHistory } = await import('../../../src/navigation/state')
    registerBrowserNavigation(controller)
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => { throw new Error('history failed') })

    expect(() => writeNavigationHistory(window.history, 'replaceState', {}, '')).toThrow('history failed')
    expect(enter()).toHaveBeenCalledOnce()
  })
})

describe('back and forward', () => {
  it('shows what the URL is, after forgetting what the entry displayed', async () => {
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)

    traverse()
    await nextTask()

    expect(window.history.state).toEqual({ other: 'kept' })
    expect(show).toHaveBeenCalledWith({ kind: 'restore', forceHeading: true })
  })

  it.each(['replace', 'push', 'reload'])('ignores an entry change of type %s', async (type) => {
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)

    traverse(type)
    await nextTask()

    expect(show).not.toHaveBeenCalled()
    expect(window.history.state).toMatchObject({ paneName: 'folder' })
  })
})

describe('without the Navigation API', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'navigation')
  })

  it('shows what the URL is on popstate', async () => {
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)

    window.dispatchEvent(new PopStateEvent('popstate'))
    await nextTask()

    expect(window.history.state).toEqual({ other: 'kept' })
    expect(show).toHaveBeenCalledOnce()
  })
})

describe('whether the page handles browser navigation', () => {
  it('says no before the listeners are registered and yes afterwards', async () => {
    const { registerBrowserNavigation, isHandlingBrowserNavigation } = await freshModule()
    expect(isHandlingBrowserNavigation()).toBe(false)

    registerBrowserNavigation(controller)

    expect(isHandlingBrowserNavigation()).toBe(true)
  })
})

describe('registering', () => {
  it('adds the listeners once, and uses the controller registered last', async () => {
    const { registerBrowserNavigation } = await freshModule()
    const addEventListener = vi.spyOn(window.navigation as never as { addEventListener: () => void }, 'addEventListener')
    const second = { show: vi.fn().mockResolvedValue(undefined) }

    registerBrowserNavigation(controller)
    registerBrowserNavigation(second as unknown as NavigationController)

    expect(addEventListener).toHaveBeenCalledTimes(2)
    await enter().mock.calls[0][0].handler()
    expect(show).not.toHaveBeenCalled()
    expect(second.show).toHaveBeenCalledOnce()
  })

  it('reports a failure to show the page instead of leaving it unhandled', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    show.mockRejectedValue(new Error('no pane'))
    const { registerBrowserNavigation } = await freshModule()
    registerBrowserNavigation(controller)

    await enter().mock.calls[0][0].handler()

    expect(error).toHaveBeenCalledWith('Failed to show the page after browser navigation.', expect.any(Error))
  })
})
