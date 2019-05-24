import { RevampPaneDefinition } from '../../../../types'
import { isPad, getTitle } from './data'
import { view as scratchpadView } from './view'

export const pane: RevampPaneDefinition = {
  canHandle: (subject, store) => isPad(subject, store),
  label: (subject, store) => getTitle(store, subject),
  view: scratchpadView
}
