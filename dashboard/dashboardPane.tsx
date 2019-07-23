import React from 'react'
import ReactDOM from 'react-dom'
import $rdf from 'rdflib'
import UI from 'solid-ui'
import panes from 'pane-registry'
import { Wrapper } from './wrapper'
import { PaneDefinition } from '../types'

const HomePane: PaneDefinition = {
  icon: UI.icons.iconBase + 'noun_547570.svg', // noun_25830

  name: 'dashboard',

  label: function () {
    if (`${location.origin}/` === location.href) {
      return 'Dashboard'
    }
    return null
  },

  render: function (subject, dom) {
    const container = document.createElement('div')
    const shadow = document.createElement('div')
    container.appendChild(shadow)
    const wrapper = document.createElement('div')
    shadow.appendChild(wrapper)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://design.inrupt.com/css/main.css'
    shadow.appendChild(link)
    const loadResource = (resourcePath: string) => {
      panes.getOutliner(dom).GotoSubject($rdf.sym(resourcePath), true, undefined, true)
    }
    // TODO: Update the value of WebID when the user logs in/out:
    UI.authn.solidAuthClient.currentSession().then((session: any) => {
      ReactDOM.render(
        <Wrapper
          store={UI.store}
          fetcher={UI.store.fetcher}
          updater={UI.store.updater}
          loadResource={loadResource}
          webId={session ? session.webId : undefined}
        />,
        wrapper
      )
    })

    return container
  }
} // pane object

// ends
export default HomePane
