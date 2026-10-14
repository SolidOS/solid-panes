/*
 * Whose pod the page is in, and which storages the viewer owns.
 *
 * Several parts of the page need this: the navbar builds its items from it, the profile heading
 * shows the owner, and the outline decides whether the file explorer header fits. Each part is
 * looked up once and cached, so they no longer each look it up, or read it back from each
 * other's DOM.
 */

import { authn } from 'solid-logic'
import { sym } from 'rdflib'
import { isWebIdUri, loadProfileFromURI } from '../utils/webIdUtils'
import { getFolderPanesFromURI, type PaneItem } from '../utils/paneUtils'
import { getPodStorages } from '../utils/podUtils'

export interface PodContext {
  /** WebID of the logged-in user. */
  viewer?: string
  /** WebID of the person whose pod the page is in; unknown when no profile could be found. */
  owner?: string
  /** The storages of that pod, as panes the navbar can open. */
  storagePanes: PaneItem[]
  /** The storages the viewer owns. */
  viewerStorages: string[]
}

const MAX_REMEMBERED = 500

// What was found depends on different parts of the URL, so each part is remembered on its own:
// - the owner depends on the document: the profile lookup can end with that document's own
//   foaf:primaryTopic, so two pages of one pod may not share an owner
// - the storages depend on the pod, derived from the origin and the first path segment
// - the viewer's storages depend only on who the viewer is
const owners = new Map<string, Promise<string | undefined>>()
const storages = new Map<string, Promise<PaneItem[]>>()
const viewerStorages = new Map<string, Promise<string[]>>()

function podKey (pageUrl: string): string {
  try {
    const url = new URL(pageUrl)
    const [first = ''] = url.pathname.split('/').filter(Boolean)
    return `${url.origin}|${first}`
  } catch {
    return pageUrl
  }
}

function documentKey (pageUrl: string): string {
  return sym(pageUrl).doc().uri
}

/**
 * Remembers a lookup, unless it failed: a failure is not kept, so that the next request asks again.
 */
function remember<T> (
  cache: Map<string, Promise<T>>,
  key: string,
  what: string,
  load: () => Promise<T>,
  fallback: T
): Promise<T> {
  const existing = cache.get(key)
  if (existing) return existing

  const created: Promise<T> = load().catch(error => {
    console.warn(`Could not load the ${what} for ${key}`, error)
    if (cache.get(key) === created) cache.delete(key)
    return fallback
  })
  cache.set(key, created)
  if (cache.size > MAX_REMEMBERED) cache.delete(cache.keys().next().value as string)
  return created
}

function ownerOf (pageUrl: string): Promise<string | undefined> {
  return remember(owners, documentKey(pageUrl), 'owner of the pod', async () => {
    const subject = sym(pageUrl)
    const webId = await loadProfileFromURI(subject)
    // The lookup falls back to the URL itself when it finds no profile
    return webId.uri === subject.uri && !isWebIdUri(subject) ? undefined : webId.value
  }, undefined)
}

function storagesOf (pageUrl: string): Promise<PaneItem[]> {
  return remember(storages, podKey(pageUrl), 'storages of the pod', () => getFolderPanesFromURI(sym(pageUrl)), [])
}

function storagesOfViewer (viewer: string | undefined): Promise<string[]> {
  if (!viewer) return Promise.resolve([])
  return remember(viewerStorages, viewer, 'storages of the viewer', async () => {
    return (await getPodStorages(sym(viewer))).map(storage => storage.uri)
  }, [])
}

/** The context for the pod a URL is in; the page's own URL by default. */
export async function getPodContext (pageUrl: string = window.location.href): Promise<PodContext> {
  const viewer = authn.currentUser()?.value
  const [owner, storagePanes, ownStorages] = await Promise.all([
    ownerOf(pageUrl), storagesOf(pageUrl), storagesOfViewer(viewer)
  ])
  return { viewer, owner, storagePanes, viewerStorages: ownStorages }
}

/** Forget what was loaded, for example when tests start over. */
export function resetPodContexts (): void {
  owners.clear()
  storages.clear()
  viewerStorages.clear()
}

/** Whether two contexts describe the same pod, so that a navbar built from one fits the other. */
export function isSamePod (a: PodContext, b: PodContext): boolean {
  return a.owner === b.owner && a.viewer === b.viewer &&
    a.storagePanes.map(pane => pane.subject.value).join() === b.storagePanes.map(pane => pane.subject.value).join()
}

export function isInViewerPod (context: PodContext, url: string): boolean {
  return context.viewerStorages.some(storage => url.startsWith(storage))
}

/** Whether the URL lies within one of the viewer's own storages. */
export async function isPageInViewerPod (url: string): Promise<boolean> {
  return isInViewerPod(await getPodContext(url), url)
}
