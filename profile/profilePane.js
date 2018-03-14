/*   Profile Pane
**
**  This outline pane provides social network functions
**  Using for example the FOAF ontology.
**  Goal:  A *distributed* version of facebook, advogato, etc etc
**  - Similarly easy user interface, but data storage distributed
**  - Read and write both user-private (address book) and public data clearly
**  -- todo: use common code to get username and load profile and set 'me'
*/

const UI = require('solid-ui')
const panes = require('./paneRegistry')
const kb = UI.store

module.exports = {
  icon: UI.icons.iconBase + 'noun_638141.svg', // see also noun_492246.svg for editing

  name: 'profile',

  label: function (subject) {
    var types = kb.findTypeURIs(subject)
    if (types[UI.ns.foaf('Person').uri] ||
    types[UI.ns.vcard('Individual').uri]) {
      return 'Your Profile'
    }
    return null
  },

  render: function (subject, dom) {

   function paneDiv (dom, subject, paneName) {
     var p = panes.byName(paneName)
     var d = p.render(subject, dom)
     d.setAttribute('style', 'border: 0.1em solid #444; border-radius: 0.5em')
     return d
   }

   var div = dom.createElement('div')
   var table = div.appendChild(dom.createElement('h2'))
   var top = table.appendChild(dom.createElement('tr'))
   var main = table.appendChild(dom.createElement('tr'))
   var bottom = table.appendChild(dom.createElement('tr'))
   var statusArea = bottom.appendChild(dom.createElement('div'))

   var context = {dom: dom, div: main, statusArea: statusArea, me: null}
   UI.authn.logInLoadProfile(context).then(context => {

     var h2 = main.appendChild(dom.createElement('h2'))

     if (!context.me.sameTerm(subject)) { // logged in as this person
       h2.textContent = 'This is not your public profile - watch this space' // later  - just display
       return div
     }
     h2.textContent = 'Edit your public profile'

     var editable = UI.store.updater.editable(subject.uri, kb)

     var p = main.appendChild(dom.createElement('p')).setAttribute('style', 'padding: 1em;')
     p.textContent = `Everything you put here will be public.
     There will be other places to record private things.`

     var h3 = main.appendChild(dom.createElement('h3'))
     h3.textContent = 'Your contact information'

     main.appendChild(paneDiv(dom, subject, 'contact'))

     h3 = main.appendChild(dom.createElement('h3'))
     h3.textContent = 'People you know'

   }, err => {
     statusArea....UI.utils.errorMessageBlock(err)
   })

    return div
  } // render()

} //
// ends
