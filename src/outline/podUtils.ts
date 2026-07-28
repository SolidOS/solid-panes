import { store } from 'solid-logic'
import { ns } from 'solid-ui'
import { NamedNode, parse } from 'rdflib'

export async function getPodStorages (podUrl: string): Promise<NamedNode[]> {
  try {
    const storage = await findPodStorageFromUrl(podUrl)
    return storage ? [storage] : []
  } catch (err) {
    console.error('cannot load container', err)
    return []
  }
}

async function findPodStorageFromUrl (url: string): Promise<NamedNode | null> {
  const podStorage = new URL(url)
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
    const response = await store.fetcher.webOperation('GET', subject.uri, store.fetcher.initFetchOptions(subject.uri, { headers: { accept: 'text/turtle' } }))
    const containerTurtle = response.responseText
    if (subject.uri && containerTurtle) {
      parse(containerTurtle, store, subject.uri, 'text/turtle')
    }
  }
}
