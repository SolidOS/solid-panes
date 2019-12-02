/*   Home Pane
 **
 ** The home pane is avaiable everywhere and allows a user
 ** to
 **  - keep track of their stuff
 **  - make new things, and possibly
 **  - keep track of accounts and workspaces etc
 **
 */

import { authn, create, icons } from 'solid-ui'
import { PaneDefinition } from 'pane-registry'

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
    var showContent = async function () {
      var homePaneContext = { div: div, dom: dom, statusArea: div, me: me }
      /*
            div.appendChild(dom.createElement('h4')).textContent = 'Login status'
            var loginStatusDiv = div.appendChild(context.dom.createElement('div'))
            // TODO: Find out what the actual type is:
            type UriType = unknown;
            loginStatusDiv.appendChild(UI.authn.loginStatusBox(context.dom, () => {
              // Here we know new log in status
            }))
      */
      div.appendChild(dom.createElement('h4')).textContent =
        'Create new thing somewhere'
      var creationDiv = div.appendChild(dom.createElement('div'))
      var creationContext = {
        div: creationDiv,
        dom: dom,
        statusArea: div,
        me: me
      }
      const relevantPanes = await authn.filterAvailablePanes(
        context.session.paneRegistry.list
      )
      create.newThingUI(creationContext, context, relevantPanes) // newUI Have to pass panes down

      div.appendChild(dom.createElement('h4')).textContent = 'Private things'
      // TODO: Replace by a common, representative interface
      authn
        .registrationList(homePaneContext, { private: true })
        .then(function (authContext) {
          div.appendChild(dom.createElement('h4')).textContent = 'Public things'
          div.appendChild(dom.createElement('p')).textContent =
            'Things in this list are visible to others.'
          authn
            .registrationList(authContext, { public: true })
            .then(function () {
              // done
            })
        })
    }

    var div = dom.createElement('div')
    var me = authn.currentUser()

    showContent()

    return div
  }
} // pane object

// ends
export default HomePaneSource
