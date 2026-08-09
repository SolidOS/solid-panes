import type { LiveStore, NamedNode } from 'rdflib'

export function deriveDeleteTargetUri (
  store: LiveStore | undefined,
  subjectUri: string | undefined,
  mintClass: NamedNode | undefined,
  explicitDeleteTargetUri: string | undefined
) {
  if (explicitDeleteTargetUri) return explicitDeleteTargetUri
  if (!subjectUri || !mintClass || !store) return undefined

  const subject = store.sym(subjectUri)
  const typeUris = store.findTypeURIs(subject)
  if (!typeUris[mintClass.uri]) return undefined

  if (subjectUri.endsWith('/index.ttl#this')) {
    return subjectUri.slice(0, -'index.ttl#this'.length)
  }

  if (subjectUri.endsWith('/index.ttl')) {
    return subjectUri.slice(0, -'index.ttl'.length)
  }

  return undefined
}

export function deriveDeleteRefreshTargetUri (
  store: LiveStore | undefined,
  subjectUri: string | undefined,
  mintClass: NamedNode | undefined,
  explicitDeleteTargetUri: string | undefined
) {
  const deleteTargetUri = deriveDeleteTargetUri(store, subjectUri, mintClass, explicitDeleteTargetUri)
  const targetUri = deleteTargetUri ?? subjectUri
  if (!targetUri || !store) return undefined

  return store.sym(targetUri).dir()?.uri
}
