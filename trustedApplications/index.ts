import { PaneDefinition } from '../types'

import paneRegistry from 'pane-registry'
import solidUi, { SolidUi } from 'solid-ui'
import { IndexedFormula } from 'rdflib'

import Vue from 'vue'
import App from './App.vue'

const nodeMode = (typeof module !== 'undefined')
const { icons } = solidUi

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

export const Pane: PaneDefinition = {
  icon: `${icons.iconBase}noun_15177.svg`,
  name: 'trustedApplications',

  label: function (subject) {
    var types = kb.findTypeURIs(subject)
    if (types[UI.ns.foaf('Person').uri] || types[UI.ns.vcard('Individual').uri]) {
      return 'Manage your trusted applications'
    }
    return null
  },

  render: function (subject) {
    return new Vue({
      el: '#TrustedApplicationsApp',
      render: h => h(App, {
        props: {
          subject
        }
      })
    }).$el
  }
}
