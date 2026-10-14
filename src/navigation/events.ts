import { parseNavigationState, type NavigationState } from './state'

/** Dispatched on the document after a view has been displayed and its history entry written. */
export const NAVIGATED_EVENT = 'solid-panes:navigated'

export interface NavigatedDetail {
  /** The page URL after displaying. */
  url: string
  /** What the history entry now says was displayed. */
  state: NavigationState
}

/**
 * Whoever calls `GotoSubject` directly (links and buttons in solid-ui, mashlib) gets the same
 * follow-up as the main page's own navigation, because the page chrome listens for this.
 */
export function announceNavigation (doc: Document): void {
  const detail: NavigatedDetail = {
    url: doc.location.href,
    state: parseNavigationState(doc.defaultView?.history.state)
  }
  doc.dispatchEvent(new CustomEvent<NavigatedDetail>(NAVIGATED_EVENT, { detail }))
}

/** Calls the listener after each navigation; returns a function that stops listening. */
export function onNavigated (listener: (detail: NavigatedDetail) => void, doc: Document = document): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<NavigatedDetail>).detail)
  doc.addEventListener(NAVIGATED_EVENT, handler)
  return () => doc.removeEventListener(NAVIGATED_EVENT, handler)
}
