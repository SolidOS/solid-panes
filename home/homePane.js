/*   Home Pane
**
** The home pane is avaiable everywhere and allows a user
** to
**  - keep track of their stuff
**  - make new things, and possibly
**  - keep track of accounts and workspaces etc
**
*/

var UI = require('solid-ui')
var panes = require('../paneRegistry')

module.exports = {
  icon: UI.icons.iconBase + 'noun_547570.svg', // noun_25830

  name: 'home',

  // Does the subject deserve an home pane?
  //
  //   yes, always!
  //
  label: function (subject) {
    return 'home'
  },

  render: function (subject, dom) {

    var showContent = function () {
      var context = {div: div, dom: dom, statusArea: div, me: me}

      div.appendChild(dom.createElement('h4')).textContent = 'Login status'
      var loginStatusDiv = div.appendChild(dom.createElement('div'))
      loginStatusDiv.appendChild(UI.authn.loginStatusBox(dom, uri => {
        // Here we know new log in status
      }))

      div.appendChild(dom.createElement('h4')).textContent = 'Create new thing somewhere'
      var creationDiv = div.appendChild(dom.createElement('div'))
      var creationContext = {div: creationDiv, dom: dom, statusArea: div, me: me}
      UI.create.newThingUI(creationContext, panes) // newUI Have to pass panes down

      div.appendChild(dom.createElement('h4')).textContent = 'Private things'
      UI.authn.registrationList(context, {private: true}).then(function (context) {
        div.appendChild(dom.createElement('h4')).textContent = 'Public things'
        UI.authn.registrationList(context, {public: true}).then(function (context) {
          // done
        })
      })
    }

    var div = dom.createElement('div')
    var me = UI.authn.currentUser()

    showContent()

    return div
  }
} // pane object

// ends
