/*   Display A Public Profile Pane
 **
 ** This is the subject's primary representation in the world.
 ** When anyone scans the QR code of their webid on theor card, it takes gthem
 ** to here and here alone.  Thiks has better be good.  This has better be
 ** worth the subjectjoing solid for
 ** - informative
 **
 ** Usage: paneRegistry.register('profile/profilePane')
 ** or standalone script adding onto existing mashlib.
 */

import { icons, ns, widgets } from 'solid-ui'
import { NamedNode } from 'rdflib'
import { paneDiv } from './profilePaneUtils'
import { PaneDefinition } from 'pane-registry'

// const nodeMode = (typeof module !== 'undefined')

// const UI = require('solid-ui')
// const panes = require('pane-registry')
/*

if (nodeMode) {
  UI = solidUi
  panes = paneRegistry
} else { // Add to existing mashlib
  panes = (window as any).panes
  UI = panes.UI
}
*/

const thisPane: PaneDefinition = {
  // 'noun_638141.svg' not editing

  global: false,

  icon: icons.iconBase + 'noun_15059.svg', // head.  noun_492246.svg for editing

  name: 'profile',

  label: function (subject, context) {
    var t = context.session.store.findTypeURIs(subject)
    if (
      t[ns.vcard('Individual').uri] ||
      t[ns.vcard('Organization').uri] ||
      t[ns.foaf('Person').uri] ||
      t[ns.schema('Person').uri]
    ) {
      return 'Profile'
    }
    return null
  },

  render: function (subject, context) {
    const store = context.session.store
    async function doRender (
      container: HTMLElement,
      subject: NamedNode | null,
      dom: HTMLDocument
    ) {
      if (!subject) throw new Error('subject missing')
      const profile = subject.doc()
      const otherProfiles = store.each(
        subject,
        ns.rdfs('seeAlso'),
        null,
        profile
      )
      if (otherProfiles.length > 0) {
        try {
          // @@ TODO Remove casting of store and store.fetcher.load
          await ((store as any).fetcher.load as any)(otherProfiles)
        } catch (err) {
          container.appendChild(widgets.errorMessageBlock(err))
        }
      }

      var backgroundColor =
        store.anyValue(
          subject,
          ns.solid('profileBackgroundColor'),
          null,
          subject.doc()
        ) || '#ffffff'
      // Todo: check format of color matches regexp and not too dark
      container.style.backgroundColor = backgroundColor // @@ Limit to pale?
      var highlightColor =
        store.anyValue(
          subject,
          ns.solid('profileHighlightColor', null, subject.doc())
        ) || '#090' // @@ beware injection attack
      container.style.border = `0.3em solid ${highlightColor}`
      container.style.borderRadius = '0.5em'
      container.style.padding = '0.7em'
      container.style.marginTop = '0.7em'
      var table = container.appendChild(dom.createElement('table'))
      // var top = table.appendChild(dom.createElement('tr'))
      var main = table.appendChild(dom.createElement('tr'))
      var bottom = table.appendChild(dom.createElement('tr'))
      var statusArea = bottom.appendChild(dom.createElement('div'))
      statusArea.setAttribute('style', 'padding: 0.7em;')

      function heading (str: string) {
        var h = main.appendChild(dom.createElement('h3'))
        h.setAttribute(
          'style',
          'font-size: 120%; color:' + highlightColor + ';'
        )
        h.textContent = str
        return h
      }

      // Todo: only show this if there is vcard info
      heading('Contact')
      const contactDisplay = paneDiv(context, subject, 'contact')
      contactDisplay.style.border = '0em' // override form
      main.appendChild(contactDisplay)

      if (store.holds(subject, ns.foaf('knows'))) {
        heading('Solid Friends')
        widgets.attachmentList(dom, subject, container, {
          doc: profile,
          modify: false,
          predicate: ns.foaf('knows'),
          noun: 'friend'
        })
      }
    }
    const dom = context.dom
    var container = dom.createElement('div')
    doRender(container, subject, dom) // async
    return container // initially unpopulated
  } // render()
} //

export default thisPane
// ENDS
