/*
* Utility functions to help load the profile
* especially when I am not logged in
*/

import { Fetcher, IndexedFormula, NamedNode, sym } from 'rdflib'
import { ns } from 'solid-ui'

const DEFAULT_PROFILE_PATH = 'profile/card#me'

export async function loadProfileFromURI (
  uri: NamedNode,
  store: IndexedFormula,
  fetcher: Fetcher
): Promise<NamedNode> {
  const pod = uri.site().uri
  // TODO: This is a hack - we cannot assume that the profile is at this document, but we will live with it for now
  const webId = sym(`${pod}${DEFAULT_PROFILE_PATH}`)
  try {
    await fetcher.load(webId)
    return webId
  } catch (err) {
    // continue
  }

  // we try a prefixed pod structure
  try {
    const uriUrl = new URL(uri.uri)
    const pathSegments = uriUrl.pathname.split('/').filter(Boolean)
    if (pathSegments.length > 0) {
      const derivedPod = `${uriUrl.origin}/${pathSegments[0]}/`
      const derivedWebId = sym(`${derivedPod}${DEFAULT_PROFILE_PATH}`)
      await fetcher.load(derivedWebId)
      return derivedWebId
    }
  } catch (err) {
    // continue
  }

  try {
    await fetcher.load(uri)
  } catch (err) {
    return uri
  }

  const primaryTopic = store.any(uri, ns.foaf('primaryTopic'), null, uri.doc())
  if (primaryTopic && primaryTopic.termType === 'NamedNode') {
    try {
      await fetcher.load(primaryTopic as NamedNode)
      return primaryTopic as NamedNode
    } catch (err) {
      return uri
    }
  }

  return uri
}

export async function getNameOfPodOwner (
  pod: NamedNode,
  store: IndexedFormula,
  fetcher: Fetcher
): Promise<string> {
  // TODO: This is a hack - we cannot assume that the profile is at this document, but we will live with it for now
  const webId = sym(`${pod.uri}${DEFAULT_PROFILE_PATH}`)
  try {
    await fetcher.load(webId)
    return getName(store, webId)
  } catch (err) {
    // continue
  }

  // we try a prefixed pod structure
  try {
    const uriUrl = new URL(pod.uri)
    const pathSegments = uriUrl.pathname.split('/').filter(Boolean)
    if (pathSegments.length > 0) {
      const derivedPod = `${uriUrl.origin}/${pathSegments[0]}/`
      const derivedWebId = sym(`${derivedPod}${DEFAULT_PROFILE_PATH}`)
      await fetcher.load(derivedWebId)
      return getName(store, derivedWebId)
    }
  } catch (err) {
    // continue
  }

  return ''
}

export function getName (store: IndexedFormula, ownersProfile: NamedNode): string {
  return (
    store.anyValue(ownersProfile, ns.vcard('fn'), null, ownersProfile.doc()) ||
    store.anyValue(ownersProfile, ns.foaf('name'), null, ownersProfile.doc()) ||
    new URL(ownersProfile.uri).host.split('.')[0]
  )
}
