import { Fetcher, IndexedFormula, NamedNode, sym } from 'rdflib'
import { ns } from 'solid-ui'

export async function generateHomepage (
  subject: NamedNode,
  store: IndexedFormula,
  fetcher: Fetcher
): Promise<HTMLElement> {
  const ownersProfile = await loadProfile(subject, fetcher)
  const name = getName(store, ownersProfile)

  const wrapper = document.createElement('div')
  wrapper.classList.add('container')
  wrapper.appendChild(createTitle(ownersProfile.uri, name))
  wrapper.appendChild(createDataSection(name))

  return wrapper
}

function createDataSection (name: string): HTMLElement {
  const dataSection = document.createElement('section')

  const title = document.createElement('h2')
  title.innerText = 'Data'
  dataSection.appendChild(title)

  const listGroup = document.createElement('div')
  listGroup.classList.add('list-group')
  dataSection.appendChild(listGroup)

  const publicDataLink = document.createElement('a')
  publicDataLink.classList.add('list-group-item')
  publicDataLink.href = '/public/'
  publicDataLink.innerText = `View ${name}'s files`
  listGroup.appendChild(publicDataLink)

  return dataSection
}

function createTitle (uri: string, name: string): HTMLElement {
  const profileLink = document.createElement('a')
  profileLink.href = uri
  profileLink.innerText = name

  const profileLinkPost = document.createElement('span')
  profileLinkPost.innerText = '\'s Pod'

  const title = document.createElement('h1')
  title.appendChild(profileLink)
  title.appendChild(profileLinkPost)

  return title
}

async function loadProfile (
  subject: NamedNode,
  fetcher: Fetcher
): Promise<NamedNode> {
  const pod = subject.site().uri
  // TODO: This is a hack - we cannot assume that the profile is at this document, but we will live with it for now
  const webId = sym(`${pod}profile/card#me`)
  await fetcher.load(webId)
  return webId
}

function getName (store: IndexedFormula, ownersProfile: NamedNode): string {
  return (
    store.anyValue(ownersProfile, ns.vcard('fn'), null, ownersProfile.doc()) ||
    store.anyValue(ownersProfile, ns.foaf('name'), null, ownersProfile.doc()) ||
    new URL(ownersProfile.uri).host.split('.')[0]
  )
}
