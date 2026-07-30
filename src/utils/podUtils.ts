import { store } from 'solid-logic'
import { ns } from 'solid-ui'
import { NamedNode, parse } from 'rdflib'
import { isWebIdUri } from './webIdUtils'

export async function getPodStorages (url: NamedNode): Promise<NamedNode[]> {
  if (isWebIdUri(url)) {
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
