import $rdf, { Fetcher, IndexedFormula, NamedNode } from 'rdflib'
import UI from 'solid-ui'

const ns = UI.ns

export async function generateHomepage (subject: NamedNode, store: IndexedFormula, fetcher: Fetcher): Promise<HTMLElement> {
  const pod = subject.site().uri
  const ownersProfile = await loadProfile(`${pod}/profile/card#me`, fetcher)
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
  profileLinkPost.innerText = `'s Pod`

  const title = document.createElement('h1')
  title.appendChild(profileLink)
  title.appendChild(profileLinkPost)

  return title
}

async function loadProfile (profileUrl: string, fetcher: Fetcher): Promise<NamedNode> {
  const webId = $rdf.sym(profileUrl)
  await fetcher.load(webId)
  return webId
}

function getName (store: IndexedFormula, ownersProfile: NamedNode): string {
  return (store.anyValue as any)(ownersProfile, ns.vcard('fn'), null, ownersProfile.doc()) ||
    (store.anyValue as any)(ownersProfile, ns.foaf('name'), null, ownersProfile.doc()) ||
    new URL(ownersProfile.uri).host.split('.')[0]
}
