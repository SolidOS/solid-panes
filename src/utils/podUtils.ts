import { store } from 'solid-logic'
import { ns } from 'solid-ui'
import { LiveStore, NamedNode, parse } from 'rdflib'
import { isWebIdUri } from './webIdUtils'
import { ACL_LINK } from 'solid-logic'
import { FileExplorerResourceMetadata } from 'src/components/file-explorer-header/types'

function parseWacAllowHeader (headerValue: string | null | undefined) {
  const permissions = new Map<string, Set<string>>()
  if (!headerValue) return permissions

  for (const entry of headerValue.split(',')) {
    const match = entry.trim().match(/^([A-Za-z]+)\s*=\s*"([^"]*)"$/)
    if (match) {
      const [, permissionGroup, accessModes] = match
      const modes = accessModes.trim().split(/\s+/).filter(Boolean)
      permissions.set(permissionGroup.toLowerCase(), new Set(modes.map(mode => mode.toLowerCase())))
    }
  }

  return permissions
}

function deriveAccessFlags (wacAllow: string | null | undefined) {
  if (!wacAllow) {
    return { canEdit: false, isPublic: false }
  }

  const permissions = parseWacAllowHeader(wacAllow)
  const userModes = permissions.get('user') ?? new Set<string>()
  const publicModes = permissions.get('public') ?? new Set<string>()

  return {
    canEdit: userModes.has('write'),
    isPublic: publicModes.has('read') || publicModes.has('write')
  }
}

export async function getPodStorages (url: NamedNode): Promise<NamedNode[]> {
  if (isWebIdUri(url)) {
    try {
      await store.fetcher.load(url.doc())
    } catch (err) {
      console.warn('Unable to load profile document for WebID', url.doc().uri, err)
    }
    const podStorages = store.each(url, ns.space('storage'))
    const results = await Promise.all(podStorages.map(async pod => await isPodStorage(pod as NamedNode) ? pod as NamedNode : null))
    return results.filter(pod => pod !== null) as NamedNode[]
  }
  try {
    const storage = await findPodStorageFromUrl(url)
    return storage ? [storage] : []
  } catch (err) {
    console.error('cannot load container', err)
    return []
  }
}

async function findPodStorageFromUrl (url: NamedNode): Promise<NamedNode | null> {
  const podStorage = new URL(url.value || url.uri)
  let pathStorage = podStorage.pathname

  while (pathStorage.length) {
    pathStorage = pathStorage.substring(0, pathStorage.lastIndexOf('/'))
    const candidate = store.sym(`${podStorage.origin}${pathStorage}/`)
    if (await isPodStorage(candidate)) return candidate
  }

  // TODO should url.origin be added to pods list when there are no pim:Storage ???
  return null
}

async function isPodStorage (pod: NamedNode): Promise<boolean> {
  await loadContainerRepresentation(pod)
  return store.holds(pod, ns.rdf('type'), ns.space('Storage'), pod.doc())
}

export async function loadContainerRepresentation (subject) {
  // force reload for index.html with RDFa
  if (!store.any(subject, ns.ldp('contains'), undefined, subject.doc())) {
    try {
      const response = await store.fetcher.webOperation('GET', subject.uri, store.fetcher.initFetchOptions(subject.uri, { headers: { accept: 'text/turtle' } }))
      const containerTurtle = response.responseText
      if (subject.uri && containerTurtle) {
        parse(containerTurtle, store, subject.uri, 'text/turtle')
      }
    } catch (err) {
      console.warn('Unable to load container representation for', subject.uri, err)
    }
  }
}

export function isContainerSubject (store: LiveStore | undefined, subjectUri: string | undefined): boolean {
  if (!store || !subjectUri) return false

  const subject = store.sym(subjectUri)
  const typeUris = store.findTypeURIs(subject)
  return Boolean(
    typeUris[ns.ldp('Container').uri] ||
    typeUris[ns.ldp('BasicContainer').uri] ||
    subject.uri.endsWith('/')
  )
}

export function getContainerItemCount (store: LiveStore | undefined, subjectUri: string | undefined): number {
  if (!store || !subjectUri) return 0

  const subject = store.sym(subjectUri)
  return store.each(subject, ns.ldp('contains')).length
}

export function getResponseMetadata (store: LiveStore, subject: NamedNode, response: Response): FileExplorerResourceMetadata {
  let contentType: string | undefined
  let canEdit = false
  let isPublic = false
  let eTag: string | undefined
  let modified: string | undefined

  if (response.headers && response.headers.get('content-type')) {
    contentType = response.headers.get('content-type')?.split(';')[0] ?? undefined
    const accessFlags = deriveAccessFlags(response.headers.get('wac-allow'))

    canEdit = accessFlags.canEdit
    isPublic = accessFlags.isPublic
    eTag = response.headers.get('etag') ?? undefined
    modified = store.anyValue(subject as any, ns.dct('modified')) || store.anyValue(subject as any, ns.dc('modified')) || undefined
  } else {
    const reqs = store.each(
      null,
      store.sym('http://www.w3.org/2007/ont/link#requestedURI'),
      subject
    )
    reqs.forEach((req: any) => {
      const responseNode = store.any(
        req as any,
        store.sym('http://www.w3.org/2007/ont/link#response')
      )
      if (responseNode && responseNode.termType === 'NamedNode') {
        contentType = store.anyValue(responseNode as any, ns.httph('content-type')) || undefined
        const wacAllow = (store.anyValue(responseNode as any, ns.httph('wac-allow')) as string | undefined) ||
          (store.anyValue(responseNode as any, ns.httph('WAC-Allow')) as string | undefined)
        const accessFlags = deriveAccessFlags(wacAllow)
        canEdit = accessFlags.canEdit
        isPublic = accessFlags.isPublic
        eTag = store.anyValue(responseNode as any, ns.httph('etag')) || undefined
        modified = store.anyValue(subject as any, ns.dct('modified')) || store.anyValue(subject as any, ns.dc('modified')) || undefined
      }
    })
  }

  const aclUri = store.any(subject, ACL_LINK)?.value || undefined
  return { contentType, canEdit, isPublic, aclUri, eTag, modified }
}

export async function fetchResourceMetadata (store: LiveStore, subject: NamedNode): Promise<FileExplorerResourceMetadata> {
  const response = await store.fetcher.webOperation('HEAD', subject.uri)

  if (!response.ok) {
    throw new Error(`HEAD request failed with status ${response.status}`)
  }

  const metadata = getResponseMetadata(store, subject, response)
  if (!metadata.contentType) {
    throw new Error('No content-type available!')
  }

  return metadata
}
