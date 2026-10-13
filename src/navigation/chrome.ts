/*
 * The rules for what the page chrome shows, as pure functions.
 *
 * What the user sees depends on the page URL, the pane that was last opened, whether the
 * account menu opened it, who is logged in and whose pod the URL is in. These functions
 * decide it from those inputs alone: they read no history, DOM or session, so every rule
 * can be tested in one place. The heading, navbar, outline and file explorer provider
 * only apply the result.
 */

import { type NavigationView } from './state'

/** Registry names of the panes that present a person rather than a resource. */
export const PERSON_PANES = ['profile', 'social']

export function isPersonPane (paneName?: string): boolean {
  return paneName !== undefined && PERSON_PANES.includes(paneName)
}

/** The parts of a navbar item that the rules look at. */
export interface NavbarItemRef {
  paneName?: string
  paneUri?: string
}

// Profile heading

export type HeadingDecision =
  | { mode: 'none' }
  | {
    /** Full on the profile pane, compact everywhere else. */
    mode: 'full' | 'compact'
    /** The profile (WebID or document) to present. */
    subjectUri: string
    paneName?: string
  }

export interface HeadingInput {
  view: NavigationView
  viaAccountMenu: boolean
  /** WebID of the logged-in user. */
  viewer?: string
  pageUrl: string
  /** WebID of the person whose pod the page is in, if known. */
  owner?: string
  /** URIs of the storages of that pod. */
  storageUris: string[]
}

/**
 * Profile and friends panes present their own subject. Any other pane shows the owner of
 * the pod the page is in, unless that is the viewer, or the view came from the account menu
 * and so shows the viewer's own content.
 */
export function deriveHeading (input: HeadingInput): HeadingDecision {
  const { view, viaAccountMenu, viewer, pageUrl, owner, storageUris } = input
  const paneName = view.pane

  // Whether the pod owner's navbar has an item for the displayed pane: Profile and Friends
  // whenever there is an owner, and a storage by its URI (any of them when the view names none).
  const ownerHasPane = paneName === 'profile' || paneName === 'social'
    ? owner !== undefined
    : paneName === 'folder' && storageUris.some(uri => !view.subject || uri === view.subject)
  const ownerUri = ownerHasPane || !viaAccountMenu ? owner : undefined

  if (!isPersonPane(paneName)) {
    if (!ownerUri || ownerUri === viewer) return { mode: 'none' }
    return { mode: 'compact', subjectUri: ownerUri, paneName }
  }

  return {
    mode: paneName === 'profile' ? 'full' : 'compact',
    subjectUri: view.subject || (ownerHasPane ? owner : undefined) || pageUrl,
    paneName
  }
}

// Navbar

export interface NavbarSelection {
  paneName?: string
  paneUri?: string
}

/** What the navbar should have selected: the displayed pane, or Profile on a WebID. */
export function deriveNavbarSelection (view: NavigationView, pageIsWebId: boolean): NavbarSelection {
  return {
    paneName: view.pane ?? (pageIsWebId ? 'profile' : undefined),
    paneUri: view.subject
  }
}

/**
 * @param storageItemCount how many storage items the navbar has; a single storage is
 * selected even when the view does not say which one it was
 */
export function isNavbarItemSelected (
  item: NavbarItemRef,
  selection: NavbarSelection,
  storageItemCount: number
): boolean {
  if (!selection.paneName || item.paneName !== selection.paneName) return false
  if (item.paneName === 'folder') {
    return selection.paneUri ? selection.paneUri === item.paneUri : storageItemCount === 1
  }
  return true
}

/** The item to select for a pane: the one for that subject, else the first for that pane. */
export function pickNavbarItem<Item extends NavbarItemRef> (
  items: Item[],
  paneName: string,
  paneUri?: string
): Item | undefined {
  const forPane = items.filter(item => item.paneName === paneName)
  return forPane.find(item => item.paneUri === paneUri) ?? forPane[0]
}

/** The navbar is not offered on the viewer's own profile, nor over account-menu content. */
export function isNavbarHidden (input: { viaAccountMenu: boolean, ownProfile: boolean }): boolean {
  return input.viaAccountMenu || input.ownProfile
}

// File explorer header

export interface ExplorerHeaderInput {
  isRootResource: boolean
  isWebId: boolean
  /**
   * The view shows a person's own subject or the viewer's content, not the resource the
   * page URL points at, so the resource header only fits inside the viewer's own pod.
   */
  viewerPodOnly: boolean
  inViewerPod: boolean
}

/** Whether the header describing a resource fits the view. */
export function deriveExplorerHeader (input: ExplorerHeaderInput): boolean {
  if (input.isRootResource || input.isWebId) return false
  return !input.viewerPodOnly || input.inViewerPod
}

/** The header is never shown over a person's profile or friends, whatever the resource. */
export function explorerHeaderForPane (resourceHeader: boolean, paneName?: string): boolean {
  return resourceHeader && !isPersonPane(paneName)
}
