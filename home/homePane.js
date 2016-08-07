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

module.exports = {
  icon: UI.icons.iconBase + 'noun_547570.svg', // noun_25830

  name: 'home',

  // Does the subject deserve an home pane?
  //
  //   yes, always!
  //
  label: function (subject) {
    return "home"
  },

  render: function (subject, dom) {

    // ////////////////////////////////////////////////////////////////////////////

    var complain = function complain (message) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: pink')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    var showContent = function(){
      var context = {div: div, dom: dom, statusArea: div, me: me}

      div.appendChild(dom.createElement('h4')).textContent = 'Private:'
      UI.widgets.registrationList(context, { private: true})

      div.appendChild(dom.createElement('h4')).textContent = 'Public:'
      UI.widgets.registrationList(context, { public: true})
    }
    var thisPane = this
    var kb = UI.store
    var ns = UI.ns

    var div = dom.createElement('div')

    var me = tabulator.preferences.get('me')
    me = me? kb.sym(me) : null
    if (!me) {
      console.log('Waiting to find out id user users to access ' + subject.doc())
      UI.widgets.checkUser(subject.doc(), function (webid) {
        me = kb.sym(webid)
        console.log('Got user id: ' + me)
        showContent()
      })
    } else {
      showContent()
    }

    return div
  }
} // pane object

// ends
