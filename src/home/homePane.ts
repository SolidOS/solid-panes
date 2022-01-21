/*   Home Pane
 **
 ** The home pane is avaiable everywhere and allows a user
 ** to
 **  - keep track of their stuff
 **  - make new things, and possibly
 **  - keep track of accounts and workspaces etc
 **
 */

import { create, icons, login } from 'solid-ui'
import { authn, authSession } from 'solid-logic'
import { PaneDefinition } from 'pane-registry'
import { CreateContext } from 'solid-ui/lib/create/types'
import { NamedNode } from 'rdflib'

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
      const homePaneContext = { div: div, dom: dom, statusArea: div, me: me }
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
        dom: dom,
        statusArea: div,
        me: me
      }
      const relevantPanes = await login.filterAvailablePanes(
        context.session.paneRegistry.list
      )
      create.newThingUI(creationContext, context, relevantPanes) // newUI Have to pass panes down

      div.appendChild(dom.createElement('h4')).textContent = 'Private things'
      // TODO: Replace by a common, representative interface
      login
        .registrationList(homePaneContext, { private: true })
        .then(function (authContext) {
          div.appendChild(dom.createElement('h4')).textContent = 'Public things'
          div.appendChild(dom.createElement('p')).textContent =
            'Things in this list are visible to others.'
          login
            .registrationList(authContext, { public: true })
            .then(function () {
              // done
            })
        })
    }

    const div = dom.createElement('div')
    const me: NamedNode = authn.currentUser() as NamedNode // this will be incorrect if not logged in

    showContent()

    return div
  }
} // pane object

// ends
export default HomePaneSource
