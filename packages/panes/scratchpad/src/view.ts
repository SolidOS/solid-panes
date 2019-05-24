import vocab from 'solid-namespace'
import $rdf from 'rdflib'
import { getContents, getSetContentsStatements, getLatestAuthor } from './data'
import { ViewParams } from '../../../../types'

const ns = vocab($rdf)

export function view ({ container, subject, store, visitNode, user }: ViewParams) {
  toViewMode()

  function toViewMode () {
    const content = getContents(store, subject)
    container.innerHTML = ''

    const lines = content.split('\n')
    lines.forEach((line) => {
      container.appendChild(document.createTextNode(line))
      container.appendChild(document.createElement('br'))
    })

    container.appendChild(document.createElement('hr'))

    if (user) {
      const editButton = document.createElement('button')
      editButton.textContent = 'Edit'
      editButton.addEventListener('click', (event) => {
        event.preventDefault()
        toEditMode()
      })
      container.appendChild(editButton)
      container.appendChild(document.createElement('br'))
    }

    const authorContainer = document.createElement('small')
    container.appendChild(authorContainer)
    showLatestAuthor(authorContainer)
  }

  /* istanbul ignore next [This function depends on a side effect (fetch), so skip it for testing for now:] */
  async function showLatestAuthor (authorContainer: HTMLElement) {
    const latestAuthor = getLatestAuthor(store, subject)
    if (latestAuthor) {
      const fetcher = $rdf.fetcher(store, {})
      await fetcher.load(latestAuthor.uri)
      const [nameStatement] = store.statementsMatching(latestAuthor, ns.vcard('fn'), null, null, true)

      authorContainer.appendChild(document.createTextNode('Latest author: '))
      const authorLink = document.createElement('a')
      authorLink.href = latestAuthor.uri
      const name = (nameStatement) ? nameStatement.object.value : latestAuthor.uri
      authorLink.textContent = name
      authorLink.title = `View the profile of ${name}`
      authorLink.addEventListener('click', (event) => {
        event.preventDefault()
        visitNode(latestAuthor)
      })
      authorContainer.appendChild(authorLink)
    }
  }

  function toEditMode () {
    /* istanbul ignore if [This should not be able to happen, but since the view is not stateless, we cannot verify this in unit tests.] */
    if (!user) {
      return
    }

    const content = getContents(store, subject)
    container.innerHTML = '<form><textarea></textarea><button type="submit">Save</button></form>'

    const textArea = container.getElementsByTagName('textarea')[0]
    textArea.textContent = content

    const form = container.getElementsByTagName('form')[0]
    /* istanbul ignore next [Side effects get executed here, so do not run them in unit tests:] */
    form.addEventListener('submit', (event) => {
      event.preventDefault()

      const creationDate = new Date()
      const [setContentDeletions, setContentAdditions] = getSetContentsStatements(textArea.value, creationDate, subject, store, user)
      store.updater.update(setContentDeletions, setContentAdditions, toViewMode)
    })
  }
}
