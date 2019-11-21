/*   Sharing Pane
 **
 **  This outline pane allows a user to view and adjust the sharing -- accesss control lists
 ** for anything which has that capability.
 **
 ** I am using in places single quotes strings like 'this'
 ** where internationalization ("i18n") is not a problem, and double quoted
 ** like "this" where the string is seen by the user and so I18n is an issue.
 */

// These used to be in js/init/icons.js but are better in the pane.
const UI = require('solid-ui')

module.exports = {
  icon: UI.icons.iconBase + 'padlock-timbl.svg', // noun_locked_2160665_000000.svg padlock
  // noun_123691.svg was rainbow

  name: 'sharing',

  // Does the subject deserve an contact pane?
  label: function (subject, context) {
    var kb = context.session.store
    var ns = UI.ns
    var t = kb.findTypeURIs(subject)
    if (t[ns.ldp('Resource').uri]) return 'Sharing' // @@ be more sophisticated?
    if (t[ns.ldp('Container').uri]) return 'Sharing' // @@ be more sophisticated?
    if (t[ns.ldp('BasicContainer').uri]) return 'Sharing' // @@ be more sophisticated?
    // check being allowed to see/change shgaring?
    return null // No under other circumstances
  },

  render: function (subject, context) {
    var dom = context.dom
    var kb = context.session.store
    var ns = UI.ns
    var div = dom.createElement('div')
    div.setAttribute('class', 'sharingPane')

    var t = kb.findTypeURIs(subject)
    var noun = 'file'
    if (t[ns.ldp('BasicContainer').uri] || t[ns.ldp('Container').uri]) {
      noun = 'folder'
    }

    var pane = dom.createElement('div')
    var table = pane.appendChild(dom.createElement('table'))
    table.setAttribute(
      'style',
      'font-size:120%; margin: 1em; border: 0.1em #ccc ;'
    )

    var statusRow = table.appendChild(dom.createElement('tr'))
    var statusBlock = statusRow.appendChild(dom.createElement('div'))
    statusBlock.setAttribute('style', 'padding: 2em;')
    var MainRow = table.appendChild(dom.createElement('tr'))
    var box = MainRow.appendChild(dom.createElement('table'))
    // var bottomRow = table.appendChild(dom.createElement('tr'));

    var sharingPaneContext = {
      target: subject,
      me: null,
      noun: noun,
      div: pane,
      dom: dom,
      statusRegion: statusBlock
    }
    var uri = UI.authn.currentUser()
    sharingPaneContext.me = uri
    UI.aclControl.preventBrowserDropEvents(dom)

    box.appendChild(
      UI.aclControl.ACLControlBox5(subject, context, noun, kb, function (
        ok,
        body
      ) {
        if (!ok) {
          box.innerHTML = 'ACL control box Failed: ' + body
        }
      })
    )

    div.appendChild(pane)
    return div
  }
}
// ends
