import { PaneDefinition } from '../types'
import UI from 'solid-ui'
import { NamedNode, parse } from 'rdflib'
import { renderTrustedApplicationsOptions } from './trustedApplications/trustedApplicationsPane'

import preferencesFormText from './preferencesFormText.ttl'
import ontologyData from './ontologyData.ttl'

const kb = UI.store

export const basicPreferencesPane: PaneDefinition = {
  icon: UI.icons.iconBase + 'noun_Sliders_341315_000000.svg',
  name: 'basicPreferences',
  label: (_subject) => {
    return null
  },

  // Render the pane
  // The subject should be the logged in user.
  render: (subject: NamedNode, dom: HTMLDocument) => {
    function complainIfBad (ok: Boolean, mess: any) {
      if (ok) return
      container.appendChild(UI.widgets.errorMessageBlock(dom, mess, '#fee'))
    }

    const container = dom.createElement('div')

    const formArea = container.appendChild(dom.createElement('div'))

    function loadData (doc: NamedNode, turtle: String) {
      doc = doc.doc() // remove # from URI if nec
      if (!kb.holds(undefined, undefined, undefined, doc)) { // If not loaded already
        (parse as any)(turtle, kb, doc.uri, 'text/turtle', null) // Load form directly
      }
    }
    const preferencesForm = kb.sym('urn:uuid:93774ba1-d3b6-41f2-85b6-4ae27ffd2597#this')
    loadData(preferencesForm, preferencesFormText)

    const ontologyExtra = kb.sym('urn:uuid:93774ba1-d3b6-41f2-85b6-4ae27ffd2597-ONT')
    loadData(ontologyExtra, ontologyData)

    async function doRender () {
      const context = await UI.authn.logInLoadPreferences({ dom, div: container })
      if (!context.preferencesFile) { // Could be CORS
        console.log('Not doing private class preferences as no access to preferences file. ' + context.preferencesFileError)
        return
      }
      const appendedForm = UI.widgets.appendForm(dom, formArea, {}, context.me, preferencesForm, context.preferencesFile, complainIfBad)
      appendedForm.style.borderStyle = 'none'

      const trustedApplicationSettings = renderTrustedApplicationsOptions(dom)
      container.appendChild(trustedApplicationSettings)
    }
    doRender()

    return container
  }
}

export default basicPreferencesPane
// ends
