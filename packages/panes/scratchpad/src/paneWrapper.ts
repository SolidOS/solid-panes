import { PaneDefinition } from '../../../../types'
import { pane } from './pane'
import { initialise } from './data'
import { Namespaces } from 'solid-namespace'
// TODO: Remove UI
import UI from 'solid-ui'
import { NamedNode } from 'rdflib'

const ns: Namespaces = UI.ns

const paneWrapper: PaneDefinition = {
  // TODO: Replace
  icon: UI.icons.iconBase + 'noun_79217.svg',

  name: 'scratchpad',

  label: function (subject, _dom, store) {
    if (!pane.canHandle(subject, store)) {
      return null
    }

    return pane.label(subject, store)
  },

  mintClass: ns.pad('Notepad'),

  mintNew: async function (newPaneOptions, store) {
    const createdPad = await initialise(store, newPaneOptions.me)

    newPaneOptions.newInstance = createdPad
    newPaneOptions.newBase = createdPad.doc().value.replace(/\/index.ttl$/, '/')

    return newPaneOptions
  },

  render: function (subject, _dom, _options, store) {
    const container = document.createElement('div')
    pane.view({
      container: container,
      subject: subject,
      store: store,
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
