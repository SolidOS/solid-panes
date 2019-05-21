import { getContents, getSetContentsStatements } from './data'
import { ViewParams } from '../types'

export function view ({ container, subject, store, user }: ViewParams) {
  toViewMode()

  function toViewMode () {
    const content = getContents(store, subject)
    container.innerHTML = ''

    const lines = content.split('\n')
    lines.forEach((line) => {
      container.appendChild(document.createTextNode(line))
      container.appendChild(document.createElement('br'))
    })

    if (user) {
      const editButton = document.createElement('button')
      editButton.textContent = 'Edit'
      editButton.addEventListener('click', (event) => {
        event.preventDefault()
        toEditMode()
      })
      container.appendChild(editButton)
    }
  }

  function toEditMode () {
    if (!user) {
      return
    }

    const content = getContents(store, subject)
    container.innerHTML = '<form><textarea></textarea><button type="submit">Save</button></form>'

    const textArea = container.getElementsByTagName('textarea')[0]
    textArea.textContent = content

    const form = container.getElementsByTagName('form')[0]
    form.addEventListener('submit', (event) => {
      event.preventDefault()

      const creationDate = new Date()
      const [setContentDeletions, setContentAdditions] = getSetContentsStatements(textArea.value, creationDate, subject, store, user)
      store.updater.update(setContentDeletions, setContentAdditions, toViewMode)
    })
  }
}
