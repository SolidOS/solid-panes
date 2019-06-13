/*   Profile Editing Pane
**
** Unlike most panes, this is available any place whatever the real subject,
** and allows the user to edit their own profile.
**
** Usage: paneRegistry.register('profile/profilePane')
** or standalone script adding onto existing mashlib.
*/

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import solidUi, { SolidUi } from 'solid-ui'
import { IndexedFormula } from 'rdflib'
import paneRegistry from 'pane-registry'

import { PaneDefinition } from '../types'
import { Container } from './container'

const nodeMode = (typeof module !== 'undefined')

let panes
let UI: SolidUi

if (nodeMode) {
  UI = solidUi
  panes = paneRegistry
} else { // Add to existing mashlib
  panes = (window as any).panes
  UI = panes.UI
}

const kb: IndexedFormula = UI.store

const thisPane: PaneDefinition = {
  icon: UI.icons.iconBase + 'noun_15177.svg', // Looks like an A - could say it's for Applications?

  name: 'trustedApplications',

  label: function (subject) {
    var types = kb.findTypeURIs(subject)
    if (types[UI.ns.foaf('Person').uri] || types[UI.ns.vcard('Individual').uri]) {
      return 'Manage your trusted applications'
    }
    return null
  },

  render: function (subject, _dom) {
    const container = document.createElement('div')
    UI.authn.solidAuthClient.currentSession().then((session: any) => {
      ReactDOM.render(
        <Container store={UI.store} subject={subject} session={session}/>,
        container
      )
    })

    return container
  }
}

export default thisPane
if (!nodeMode) {
  console.log('*** patching in live pane: ' + thisPane.name)
  panes.register(thisPane)
}
