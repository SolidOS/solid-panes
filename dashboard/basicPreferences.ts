import { PaneDefinition, SolidSession } from "../types"
import solidUi, { SolidUi } from "solid-ui"
import paneRegistry from "pane-registry"
import { NamedNode, sym } from "rdflib"
import { generateHomepage } from "./homepage"

let panes: any
let UI: SolidUi
const kb = UI.store
const $rdf = UI.rdf
const ns = UI.ns

const nodeMode = (typeof module !== 'undefined')

if (nodeMode) {
  UI = solidUi
  panes = paneRegistry
} else { // Add to existing mashlib
  panes = (window as any).panes
  UI = panes.UI
}

export const basicPreferencesPane: PaneDefinition = {
  icon: UI.icons.iconBase + 'noun_Sliders_341315_000000.svg',
  name: 'basicPreferences',
  label: (subject) => {
    if (subject.uri === subject.site().uri) {
      return "Prefs"
    }
    return null
  },

  // Render the pane
  // The subject should be the logged in user.
  render: (subject: NamedNode, dom: HTMLDocument, paneOptions: any) => {
    function complainIfBad (ok: Boolean, mess: any) {
      if (ok) return
      container.appendChild(UI.widgets.errorMessageBlock(dom, mess, '#fee'))
    }

    const container = dom.createElement('div')

    const formArea = container.appendChild(dom.createElement('div'))
    const statusArea = container.appendChild(dom.createElement('div'))


    /* Preferences
    **
    **  Things like whether to color text by author webid, to expand image URLs inline,
    ** expanded inline image height. ...
    ** In general, preferences can be set per user, per user/app combo, per instance,
    ** and per instance/user combo. (Seee the long chat pane preferences for an example.)
    ** Here in the basic preferences, we are only setting  per-user defaults.
    */

    const preferencesFormText = `

  @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
  @prefix solid: <http://www.w3.org/ns/solid/terms#>.
  @prefix ui: <http://www.w3.org/ns/ui#>.
  @prefix : <#>.

  :this
    <http://purl.org/dc/elements/1.1/title> "Basic preferences" ;
    a ui:Form ;
    ui:part :powerUser, :developerUser;
    ui:parts ( :powerUser :developerUser  ).

:powerUser a ui:BooleanField; ui:property solid:powerUser;
  ui:label "Color user input by user".
:developerUser a ui:BooleanField; ui:property solid:developerUser;
  ui:label "Expand image URLs inline".
:newestFirst a ui:BooleanField; ui:property solid:newestFirst;
  ui:label "Newest messages at the top".

:inlineImageHeightEms a ui:IntegerField; ui:property solid:inlineImageHeightEms;
  ui:label "Inline image height (lines)".

`
    const preferencesForm = kb.sym('https://solid.github.io/solid-panes/dashboard/basicPreferencesForm.ttl#this')
    const preferencesFormDoc = preferencesForm.doc()
    if (!kb.holds(undefined, undefined, undefined, preferencesFormDoc)) { // If not loaded already
      $rdf.parse(preferencesFormText, kb, preferencesFormDoc.uri, 'text/turtle') // Load form directly
    }
    // todo make Statement type for fn nelow
    let preferenceProperties = kb.statementsMatching(null, ns.ui.property, null, preferencesFormDoc).map(function (st: any) {return st.object})
    var me = UI.authn.currentUser()
    // var context = {noun: 'chat room', me: me, statusArea: statusArea, div: formArea, dom, kb}
    // container.appendChild(UI.preferences.renderPreferencesForm(me, mainClass, preferencesForm, context))
    UI.widgets.appendForm(dom, formArea, {}, me, preferencesForm, me.doc(), complainIfBad)
    return container
  }
}
// ends
