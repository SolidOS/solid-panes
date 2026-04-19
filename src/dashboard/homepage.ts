import { Fetcher, IndexedFormula, NamedNode } from 'rdflib'
import { loadProfileFromURI, getName } from '../profileUtils/ownerProfile'

export async function generateHomepage (
  uri: NamedNode,
  store: IndexedFormula,
  fetcher: Fetcher
): Promise<HTMLElement> {
  const ownersProfile = await loadProfileFromURI(uri, store, fetcher)
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
  publicDataLink.href = window.document.location.href + 'public/'
  publicDataLink.innerText = `View ${name}'s files`
  listGroup.appendChild(publicDataLink)

  return dataSection
}

function createTitle (uri: string, name: string): HTMLElement {
  const profileLink = document.createElement('a')
  profileLink.href = uri
  profileLink.innerText = name

  const profileLinkPost = document.createElement('span')
  profileLinkPost.innerText = '\'s Profile'

  const title = document.createElement('h1')
  title.appendChild(profileLink)
  title.appendChild(profileLinkPost)

  return title
}
