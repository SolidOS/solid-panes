import { RevampPaneDefinition } from '../types'
import { isPad, getContents, getTitle } from './data'

export const pane: RevampPaneDefinition = {
  canHandle: (subject, store) => isPad(subject, store),
  label: (subject, store) => getTitle(store, subject),
  attach: (dom, subject, store) => {
    const content = getContents(store, subject)
    const lines = content.split('\n')
    lines.forEach((line) => {
      dom.appendChild(document.createTextNode(line))
      dom.appendChild(document.createElement('br'))
    })
  }
}
