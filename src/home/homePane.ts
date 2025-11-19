/*   Home Pane
 **
 ** The home pane is avaiable everywhere and allows a user
 ** to
 **  - keep track of their stuff
 **  - make new things, and possibly
 **  - keep track of accounts and workspaces etc
 **
 */

import { PaneDefinition } from 'pane-registry'
import { NamedNode } from 'rdflib'
import { authn } from 'solid-logic'
import { create, CreateContext, icons, login } from 'solid-ui'

const HomePaneSource: PaneDefinition = {
  icon: icons.iconBase + 'noun_547570.svg', // noun_25830

  global: true,

  name: 'home',

  // Does the subject deserve an home pane?
  //
  //   yes, always!
  //
  label: function () {
    return 'home'
  },

  render: function (subject, context) {
    const dom = context.dom
    const showContent = async function () {
      const homePaneContext = { div, dom, statusArea: div, me }
      /*
            div.appendChild(dom.createElement('h4')).textContent = 'Login status'
            var loginStatusDiv = div.appendChild(context.dom.createElement('div'))
            // TODO: Find out what the actual type is:
            type UriType = unknown;
            loginStatusDiv.appendChild(UI.login.loginStatusBox(context.dom, () => {
              // Here we know new log in status
            }))
      */
      div.appendChild(dom.createElement('h4')).textContent =
        'Create new thing somewhere'
      const creationDiv = div.appendChild(dom.createElement('div'))
      const creationContext: CreateContext = {
        div: creationDiv,
        dom,
        statusArea: div,
        me
      }
      const relevantPanes = await login.filterAvailablePanes(
        context.session.paneRegistry.list
      )
      create.newThingUI(creationContext, context, relevantPanes) // newUI Have to pass panes down

      login.registrationList(homePaneContext, {}).then(function () {})
    }

    const div = dom.createElement('div')
    const me: NamedNode = authn.currentUser() as NamedNode // this will be incorrect if not logged in

    showContent()

    return div
  }
} // pane object

// ends
export default HomePaneSource
