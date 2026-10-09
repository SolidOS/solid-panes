/*   Main Page
 **
 **  This code is called in mashlib and renders the header and left side menu of the Databrowser.
 */

import { LiveStore, NamedNode } from 'rdflib'
import type { RenderEnvironment } from 'pane-registry'
import * as paneRegistry from 'pane-registry'
import { getOutliner, OutlineManager } from '../index'
import { createHeader } from './header'
import { createNavbar, selectNavbarPane } from './navbar'
import { getFolderPaneForStorage, getProfilePaneFromURI, getSocialPaneFromURI } from '../utils/paneUtils'
import { isWebIdUri } from '../utils/webIdUtils'
import { initializeProfileHeading, refreshProfileHeading } from './profileHeading'

// Symbol used to stash the last render-relevant env snapshot on the outliner
// so refreshUI can skip a full GotoSubject re-render when nothing changed.
const LAST_RENDER_ENV_KEY = '__lastRenderEnvSignature'

function renderEnvSignature (env?: RenderEnvironment): string {
  if (!env) return ''
  return [env.layout, env.theme, env.inputMode].join('|')
}

function ensureMainContent () {
  let main = document.getElementById('MainContent') as HTMLElement | null
  if (!main) {
    main = document.createElement('main')
    main.id = 'MainContent'
    main.setAttribute('role', 'main')
    main.setAttribute('tabindex', '-1')
    main.setAttribute('aria-live', 'polite')
    document.body.appendChild(main)
  }
  return main
}

function clearPaneState () {
  const { paneName, paneUri, viaAccountMenu, ...rest } = window.history.state ?? {}
  window.history.replaceState(rest, '', window.location.href)
}

// A reload keeps history.state; when it came from the account menu it
// describes the viewer's own content, not the URL being loaded.
function discardAccountMenuState () {
  if (window.history.state?.viaAccountMenu) clearPaneState()
}

interface NavigationEvent extends Event {
  canIntercept: boolean
  userInitiated: boolean
  navigationType: string
  destination: { url: string }
  intercept: (options: { handler: () => Promise<void>, scroll: 'manual', focusReset: 'manual' }) => void
}

interface NavigationApi {
  addEventListener: (type: 'navigate' | 'currententrychange', listener: (event: NavigationEvent) => void) => void
}

let browserNavigationOutliner: { store: LiveStore, outliner: OutlineManager } | undefined
let browserNavigationListenersRegistered = false
let historyEntryRequest = 0

type HistoryState = { paneName?: string, paneUri?: string, viaAccountMenu?: boolean } | null
async function paneForHistoryEntry (store: LiveStore, subject: NamedNode, state: HistoryState) {
  const { paneName, paneUri } = state ?? {}
  // These panes render a subject other than the page URL, saved as paneUri.
  if (paneName && typeof paneUri === 'string' && paneUri) {
    const paneSubject = store.sym(paneUri)
    if (paneName === 'profile') return getProfilePaneFromURI(paneSubject)
    if (paneName === 'social') return getSocialPaneFromURI(paneSubject)
    if (paneName === 'folder') return getFolderPaneForStorage(paneSubject)
  }
  if (paneName) return paneRegistry.byName(paneName) ?? undefined
  return isWebIdUri(subject) ? getProfilePaneFromURI(subject) : undefined
}

// Renders the pane described by a history entry's state for the current URL,
// without changing the URL, and brings the navbar and heading in line with it.
async function showCurrentHistoryEntry (
  store: LiveStore,
  outliner: OutlineManager,
  forceHeading = false,
  state: HistoryState = window.history.state
) {
  const request = ++historyEntryRequest
  const { viaAccountMenu } = state ?? {}
  const subject = store.sym(window.location.href)
  const pane = await paneForHistoryEntry(store, subject, state)
  if (request !== historyEntryRequest) return

  outliner.GotoSubject(subject, true, pane ?? undefined, true, undefined, undefined, !viaAccountMenu)
  const navbar = document.querySelector<HTMLElement>('solid-panes-navbar')
  if (viaAccountMenu) {
    navbar?.classList.add('navbar--hidden')
  } else {
    const { paneName, paneUri } = window.history.state ?? {}
    if (paneName) selectNavbarPane(paneName, paneUri)
  }
  await refreshProfileHeading(forceHeading)
}

function reportBrowserNavigationError (error: unknown) {
  console.error('Failed to show the page after browser navigation.', error)
}

// The browser changes the URL and history entry without reloading the page in two
// cases the page would otherwise not notice:
// - Enter on the current URL (typically one ending in #me), which must show the
//   URL's own profile rather than what the account menu displayed.
// - Back and forward, which must show what each history entry displayed.
function registerBrowserNavigationListeners (store: LiveStore, outliner: OutlineManager) {
  browserNavigationOutliner = { store, outliner }
  if (browserNavigationListenersRegistered) return
  browserNavigationListenersRegistered = true

  const showEntry = (forceHeading: boolean, state?: HistoryState) => {
    if (!browserNavigationOutliner) return Promise.resolve()
    return showCurrentHistoryEntry(
      browserNavigationOutliner.store, browserNavigationOutliner.outliner, forceHeading, state
    ).catch(reportBrowserNavigationError)
  }

  // mashlib re-renders the default pane in its own popstate handler, which also
  // drops the account-menu marker from the entry's state. Keep the state as it
  // was when the browser navigated and render once those handlers have finished,
  // so the restored entry wins.
  const showEntryAfterHandlers = () => {
    const state = window.history.state
    setTimeout(() => { showEntry(false, state) })
  }

  const navigation = (window as unknown as { navigation?: NavigationApi }).navigation
  if (!navigation) {
    window.addEventListener('popstate', showEntryAfterHandlers)
    return
  }

  navigation.addEventListener('navigate', event => {
    if (!event.canIntercept || !event.userInitiated || event.navigationType !== 'replace' ||
        event.destination.url !== window.location.href) return

    event.intercept({
      scroll: 'manual',
      focusReset: 'manual',
      handler: () => {
        clearPaneState()
        return showEntry(true)
      }
    })
  })

  // Unlike popstate, this does not fire for in-page fragment links.
  navigation.addEventListener('currententrychange', event => {
    if (event.navigationType === 'traverse') showEntryAfterHandlers()
  })
}

export async function initMainPage (
  store: LiveStore,
  uri?: string | NamedNode | null,
  environment?: RenderEnvironment
) {
  ensureMainContent()
  uri = uri || window.location.href
  const subject: NamedNode = typeof uri === 'string' ? store.sym(uri) : uri
  // A reload of a WebID always shows its profile, whatever pane the history entry
  // last displayed. Elsewhere, only content the account menu showed in place of
  // the URL's own is dropped.
  if (isWebIdUri(subject)) clearPaneState()
  else discardAccountMenuState()
  initializeProfileHeading()
  const outliner = getOutliner(document, environment)
  ;(outliner as any)[LAST_RENDER_ENV_KEY] = renderEnvSignature(environment)
  registerBrowserNavigationListeners(store, outliner)
  const initialPane = await paneForHistoryEntry(store, subject, window.history.state)

  outliner.GotoSubject(subject, true, initialPane, true, undefined, undefined, true, false)
  await refreshProfileHeading()

  const header = await createHeader(outliner)
  const navbar = await createNavbar(outliner)
  return Promise.all([header, navbar])
}

export async function refreshUI (outliner: OutlineManager) {
  const store = outliner?.context?.session?.store

  // Only re-run GotoSubject (full pane re-render) when render-relevant
  // environment fields actually changed since the last render.
  const currentSignature = renderEnvSignature(outliner?.context?.environment)
  const previousSignature = (outliner as any)?.[LAST_RENDER_ENV_KEY] ?? ''
  const envChanged = currentSignature !== previousSignature

  if (envChanged && store && typeof outliner?.GotoSubject === 'function') {
    // Re-render what the current history entry displays without changing the
    // URL or losing that it came from the account menu.
    await showCurrentHistoryEntry(store, outliner)
    ;(outliner as any)[LAST_RENDER_ENV_KEY] = currentSignature
  }
}
