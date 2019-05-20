import { PaneDefinition } from '../types'
import { pane } from './pane'
import { initialise } from './data'
import { Namespaces } from 'solid-namespace'
import UI from 'solid-ui'
import { IndexedFormula } from 'rdflib'

const store: IndexedFormula = UI.store
const ns: Namespaces = UI.ns

const paneWrapper: PaneDefinition = {
  // TODO: Replace
  icon: UI.icons.iconBase + 'noun_79217.svg',

  name: 'scratchpad',

  label: function (subject) {
    if (!pane.canHandle(subject, store)) {
      return null
    }

    return pane.label(subject, store)
  },

  mintClass: ns.pad('Notepad'),

  mintNew: async function (newPaneOptions) {
    var kb = UI.store

    const createdPad = await initialise(kb, newPaneOptions.me)

    newPaneOptions.newInstance = createdPad
    newPaneOptions.newBase = createdPad.doc().value.replace(/\/index.ttl$/, '/')

    return newPaneOptions
  },

  render: function (subject, _dom) {
    const container = document.createElement('div')
    const user = UI.authn.currentUser()
    pane.attach(container, subject, UI.store, user)
    return container
  }
}

export default paneWrapper
