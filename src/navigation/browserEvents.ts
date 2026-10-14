/*
 * What the page does when the browser changes the URL or the history entry without reloading.
 *
 * Like a reload, both cases show what the URL is, not what the entry last displayed through the
 * navbar or the account menu:
 * - Enter on the current URL (typically one ending in #me)
 * - back and forward
 */

import type { NavigationController } from './controller'
import { clearPaneState } from './state'

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

let navigation: NavigationController | undefined
let listenersRegistered = false

/**
 * Whether the main page handles back and forward itself. Packages that used to re-render on
 * `popstate` (mashlib) ask this and leave it to the main page.
 */
export function isHandlingBrowserNavigation (): boolean {
  return listenersRegistered
}

function reportError (error: unknown) {
  console.error('Failed to show the page after browser navigation.', error)
}

/**
 * Starts handling Enter, back and forward for a controller. The listeners are added once;
 * calling this again only changes which controller they use.
 *
 * The Navigation API is used where the browser has it; the places that fall back to an older
 * mechanism are marked NAVIGATION API FALLBACK. See "Browser support" in docs/navigation-design.md.
 */
export function registerBrowserNavigation (controller: NavigationController): void {
  navigation = controller
  if (listenersRegistered) return
  listenersRegistered = true

  const showUrl = () => {
    clearPaneState()
    return (navigation?.show({ kind: 'restore', forceHeading: true }) ?? Promise.resolve()).catch(reportError)
  }

  const navigationApi = (window as unknown as { navigation?: NavigationApi }).navigation
  if (!navigationApi) {
    // NAVIGATION API FALLBACK (Firefox before 147, Safari before 26.2, older Chromium).
    // Back and forward use `popstate`, which cannot tell them from in-page `#` links, so a
    // fragment link also re-renders the page. Enter on the current URL is not handled at all
    // here: without a fragment the browser reloads the page, and `initMainPage` shows the URL.
    window.addEventListener('popstate', () => { showUrl() })
    return
  }

  // NAVIGATION API: Enter on the current URL (typically one ending in #me) is a same-URL
  // "replace" navigation; intercepting it shows the URL without reloading. Without the API
  // there is no equivalent, see the fallback above.
  navigationApi.addEventListener('navigate', event => {
    if (!event.canIntercept || !event.userInitiated || event.navigationType !== 'replace' ||
        event.destination.url !== window.location.href) return

    event.intercept({
      scroll: 'manual',
      focusReset: 'manual',
      handler: showUrl
    })
  })

  // NAVIGATION API: unlike the `popstate` fallback above, this does not fire for in-page
  // fragment links.
  navigationApi.addEventListener('currententrychange', event => {
    if (event.navigationType === 'traverse') showUrl()
  })
}
