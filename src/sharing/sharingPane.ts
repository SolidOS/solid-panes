/*   Sharing Pane
 **
 ** This outline pane allows a user to view and adjust the sharing -- access control lists
 ** for anything which has that capability.
 **
 ** I am using in places single quotes strings like 'this'
 ** where internationalization ("i18n") is not a problem, and double quoted
 ** like "this" where the string is seen by the user and so I18n is an issue.
 */

import { aclControl, icons, ns } from 'solid-ui'

const sharingPane = {
  icon: icons.iconBase + 'padlock-timbl.svg',

  name: 'sharing',

  label: (subject, context) => {
    const store = context.session.store
    const t = store.findTypeURIs(subject)
    if (t[ns.ldp('Resource').uri]) return 'Sharing' // @@ be more sophisticated?
    if (t[ns.ldp('Container').uri]) return 'Sharing' // @@ be more sophisticated?
    if (t[ns.ldp('BasicContainer').uri]) return 'Sharing' // @@ be more sophisticated?
    // check being allowed to see/change sharing?
    return null // No under other circumstances
  },

  render: (subject, context) => {
    const dom = context.dom
    const store = context.session.store
    const div = dom.createElement('div')
    div.setAttribute('class', 'sharingPane')

    const noun = getNoun()

    const pane = dom.createElement('div')
    const table = pane.appendChild(dom.createElement('table'))
    table.setAttribute('style', 'font-size:120%; margin: 1em; border: 0.1em #ccc ;')

    const statusRow = table.appendChild(dom.createElement('tr'))
    const statusBlock = statusRow.appendChild(dom.createElement('div'))
    statusBlock.setAttribute('style', 'padding: 2em;')
    const MainRow = table.appendChild(dom.createElement('tr'))
    const box = MainRow.appendChild(dom.createElement('table'))

    aclControl.preventBrowserDropEvents(dom)

    box.appendChild(aclControl.ACLControlBox5(subject, context, noun, store))

    div.appendChild(pane)
    return div

    function getNoun () {
      const t = store.findTypeURIs(subject)
      if (t[ns.ldp('BasicContainer').uri] || t[ns.ldp('Container').uri]) {
        return 'folder'
      }
      return 'file'
    }
  }
}

export default sharingPane
