/*
 * What a history entry records about the view that was displayed.
 *
 * This is the only module that knows how that is stored in `history.state`; everything
 * else works with `NavigationState`. The stored fields are `paneName`, `paneUri` and
 * `viaAccountMenu`, next to whatever other keys the entry carries.
 */

export type ViewKind = 'default' | 'profile' | 'friends' | 'storage' | 'pane'

export interface NavigationView {
  kind: ViewKind
  /** Registry name of the displayed pane. Always set unless the kind is `default`. */
  pane?: string
  /** What the pane displays when that is not the page URL (a profile, friends list or storage). */
  subject?: string
}

export interface NavigationState {
  view: NavigationView
  /** The account menu opened the view: it shows the viewer's own content under the page URL. */
  viaAccountMenu: boolean
}

const KIND_BY_PANE: Record<string, ViewKind> = {
  profile: 'profile',
  social: 'friends',
  folder: 'storage'
}

function asRecord (raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' ? raw as Record<string, unknown> : {}
}

export function viewFromPane (pane?: string, subject?: string): NavigationView {
  if (!pane) return { kind: 'default' }
  return { kind: KIND_BY_PANE[pane] ?? 'pane', pane, ...(subject ? { subject } : {}) }
}

export function parseNavigationState (raw: unknown): NavigationState {
  const { paneName, paneUri, viaAccountMenu } = asRecord(raw)
  return {
    view: viewFromPane(
      typeof paneName === 'string' && paneName ? paneName : undefined,
      typeof paneUri === 'string' && paneUri ? paneUri : undefined
    ),
    viaAccountMenu: viaAccountMenu === true
  }
}

export function readNavigationState (): NavigationState {
  return parseNavigationState(window.history.state)
}

export interface HistoryStateChange {
  /** The pane that is being displayed, and its own subject if it has one. */
  pane?: { name: string, subject?: string }
  /** The entry is for a different URL than the current one. */
  leavingPage: boolean
  /** The account menu is displaying it. */
  viaAccountMenu: boolean
}

/**
 * The state to store for an entry after displaying something.
 *
 * Pane details describe what was displayed, so they must not leak into the entry of
 * another URL, nor outlive the pane they were saved for. The account-menu marker
 * keeps a later page load from restoring the viewer's content over the URL's subject.
 */
export function nextHistoryState (current: unknown, change: HistoryStateChange): Record<string, unknown> {
  const next: Record<string, unknown> = { ...asRecord(current) }

  if (change.pane) {
    next.paneName = change.pane.name
    if (typeof change.pane.subject === 'string') next.paneUri = change.pane.subject
  }
  if (change.leavingPage && !change.pane) delete next.paneName
  if ((change.leavingPage && !change.pane) || (change.pane && !change.pane.subject)) delete next.paneUri

  if (change.viaAccountMenu) next.viaAccountMenu = true
  else delete next.viaAccountMenu

  return next
}

/** The state without anything about the displayed pane. */
export function withoutPaneState (raw: unknown): Record<string, unknown> {
  const { paneName, paneUri, viaAccountMenu, ...rest } = asRecord(raw)
  return rest
}

/** Forget what the current entry displayed, so the URL alone decides what to show. */
export function clearPaneState (): void {
  window.history.replaceState(withoutPaneState(window.history.state), '', window.location.href)
}
