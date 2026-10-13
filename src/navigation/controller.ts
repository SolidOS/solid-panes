/*
 * The one place that displays a view and brings the page chrome in line with it.
 *
 * The account menu, the navbar, a page load, Enter in the address bar, back and forward and a
 * layout change used to each resolve a pane, call `GotoSubject` and then do some of the follow-up
 * themselves. Now each describes what it wants as an intent, and the follow-up is always the same:
 * navbar visibility and selection, then the profile heading.
 */

import type { LiveStore, NamedNode } from 'rdflib'
import type { PaneDefinition } from 'pane-registry'
import type { OutlineManager } from '../outline/manager'
import { getFolderPaneForStorage, getProfilePaneFromURI, getSocialPaneFromURI, type PaneItem } from '../utils/paneUtils'
import { setNavbarHidden } from './navbarVisibility'
import { readNavigationState, type NavigationState, type NavigationView } from './state'
import type { NavigationSource } from './options'
import { isWebIdUri } from '../utils/webIdUtils'

export type NavigationIntent =
  /** Display what the current history entry says was displayed, for the page's own URL. */
  | {
    kind: 'restore'
    /** The page subject, when it is not the current URL. */
    subject?: string
    /** Redo the heading even if it believes it already shows the right profile. */
    forceHeading?: boolean
  }
  /** A person's profile or friends, by WebID. */
  | { kind: 'profile' | 'friends', subject: string, source?: NavigationSource }
  /** A storage, as the navbar or the account menu offers it. */
  | { kind: 'storage', pane: PaneItem, source?: NavigationSource }
  /** A pane of the application itself, by registry name (dashboard, preferences). */
  | { kind: 'app', pane: string, source?: NavigationSource }

export interface NavigationEffects {
  selectNavbarPane: (paneName: string, paneUri?: string) => void
  refreshHeading: (force: boolean) => Promise<void>
}

export interface NavigationDeps {
  store: LiveStore
  outliner: OutlineManager
  byName: (name: string) => PaneDefinition | null | undefined
  effects: NavigationEffects
}

export interface NavigationController {
  /**
   * Display what the intent asks for. If another intent arrives while this one is still
   * resolving its pane, only the later one is displayed.
   */
  show: (intent: NavigationIntent) => Promise<void>
}

type DisplayedPane = PaneItem | PaneDefinition | null | undefined

export function createNavigationController (deps: NavigationDeps): NavigationController {
  const { store, outliner, byName, effects } = deps
  let latest = 0

  async function paneForView (subject: NamedNode, view: NavigationView): Promise<DisplayedPane> {
    // These panes render a subject other than the page URL.
    if (view.subject) {
      const paneSubject = store.sym(view.subject)
      if (view.kind === 'profile') return getProfilePaneFromURI(paneSubject)
      if (view.kind === 'friends') return getSocialPaneFromURI(paneSubject)
      if (view.kind === 'storage') return getFolderPaneForStorage(paneSubject)
    }
    if (view.pane) return byName(view.pane) ?? undefined
    return isWebIdUri(subject) ? getProfilePaneFromURI(subject) : undefined
  }

  async function paneFor (intent: NavigationIntent, subject: NamedNode, state: NavigationState): Promise<DisplayedPane> {
    switch (intent.kind) {
      case 'restore': return paneForView(subject, state.view)
      case 'profile': return getProfilePaneFromURI(store.sym(intent.subject))
      case 'friends': return getSocialPaneFromURI(store.sym(intent.subject))
      case 'storage': return intent.pane
      case 'app': return byName(intent.pane)
    }
  }

  return {
    async show (intent) {
      const request = ++latest
      const state = readNavigationState()
      const source: NavigationSource = intent.kind === 'restore'
        ? (state.viaAccountMenu ? 'accountMenu' : 'default')
        : intent.source ?? 'default'
      // The account menu shows the viewer's own content, so the navbar for the page is not offered
      if (source === 'accountMenu') setNavbarHidden(true)

      const subject = store.sym(intent.kind === 'restore' && intent.subject ? intent.subject : window.location.href)
      const pane = await paneFor(intent, subject, state)
      if (request !== latest) return

      // Without a pane the outline would fall back to the page URL's own default view, which
      // is only right when restoring an entry that displayed nothing in particular.
      if (!pane && intent.kind !== 'restore') {
        console.warn('Could not open the requested view for the logged-in user.')
        return
      }

      outliner.GotoSubject(subject, true, pane ?? undefined, true, undefined, undefined, { source })

      if (source !== 'accountMenu') {
        const { view } = readNavigationState()
        if (view.pane) effects.selectNavbarPane(view.pane, view.subject)
      }
      await effects.refreshHeading(intent.kind === 'restore' && intent.forceHeading === true)
    }
  }
}
