import React from 'react'
import ReactDOM from 'react-dom'
import UI from 'solid-ui'
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
    const shadow = container.attachShadow({ mode: 'closed' })
    const wrapper = document.createElement('div')
    shadow.appendChild(wrapper)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/common/css/bootstrap.min.css'
    shadow.appendChild(link)
    // TODO: Update the value of WebID when the user logs in/out:
    const pod = `${location.protocol}//${location.host}`
    UI.authn.solidAuthClient.currentSession().then((session: any) => {
      ReactDOM.render(
        <Wrapper
          store={UI.store}
          fetcher={UI.store.fetcher}
          updater={UI.store.updater}
          pod={pod}
        />,
        wrapper
      )
    })

    return container
  }
} // pane object

// ends
export default HomePane
