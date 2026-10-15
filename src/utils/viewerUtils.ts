import { authn } from 'solid-logic'
import type { NamedNode } from 'rdflib'
import type { ViewerMode } from '../types'

// Long-lived UI (e.g. the header) outlives logins, so resolve the viewer on demand.
export async function getCurrentViewer (): Promise<NamedNode | null> {
  return authn.currentUser() ?? await authn.checkUser()
}

// Relation of a viewer to a subject, without checking write access.
export function getViewerRelation (subject: NamedNode, viewer: unknown = authn.currentUser()): ViewerMode {
  const { value, uri } = (typeof viewer === 'object' && viewer !== null ? viewer : {}) as { value?: string, uri?: string }
  const viewerUri = typeof viewer === 'string' ? viewer : value || uri || null
  if (!viewerUri) return 'anonymous'
  return viewerUri === subject.value ? 'owner' : 'authenticated'
}
