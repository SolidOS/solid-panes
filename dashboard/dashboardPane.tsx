import React from 'react'
import ReactDOM from 'react-dom'
import UI from 'solid-ui'
import panes from 'pane-registry'
import { Wrapper } from './wrapper'
import { PaneDefinition } from '../types'

const HomePane: PaneDefinition = {
  icon: UI.icons.iconBase + 'noun_547570.svg', // noun_25830

  name: 'dashboard',

  label: function () {
    return 'Dashboard'
  },

  render: function (subject, dom) {
    const container = document.createElement('div')
    const loadResource = (resourcePath: string) => {
      panes.getOutliner(dom).GotoSubject(resourcePath, true, undefined, true)
    }
    UI.authn.solidAuthClient.currentSession().then((session: any) => {
      ReactDOM.render(
        <Wrapper
          store={UI.store}
          fetcher={UI.store.fetcher}
          updater={UI.store.updater}
          webId={session.webId}
          loadResource={loadResource}
        />,
        container
      )
    })

    return container
  }
} // pane object

// ends
export default HomePane
