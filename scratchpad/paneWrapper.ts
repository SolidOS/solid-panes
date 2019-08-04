import { PaneDefinition } from '../types'
import { pane } from './pane'
import { initialise } from './data'
import { Namespaces } from 'solid-namespace'
import * as UI from 'solid-ui'
import { IndexedFormula, NamedNode } from 'rdflib'

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
    pane.view({
      container: container,
      subject: subject,
      store: UI.store,
      visitNode: visitNode,
      user: UI.authn.currentUser()
    })
    return container
  }
}

function visitNode (node: NamedNode) {
  const outliner = (window as any).panes.getOutliner(document)
  outliner.GotoSubject(node, true, undefined, true, undefined)
}

export default paneWrapper
