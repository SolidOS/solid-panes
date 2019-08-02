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

// import UI from 'solid-ui'
// import solidUi, { SolidUi } from 'solid-ui'
import { NamedNode } from 'rdflib'
import panes from 'pane-registry'

import { PaneDefinition } from '../types'
import { getLabel } from './profilePaneUtils'

const nodeMode = (typeof module !== 'undefined')

const UI = require('solid-ui')
const panes = require('pane-registry')
/*
 let panes: any
let UI: SolidUi

if (nodeMode) {
  UI = solidUi
  panes = paneRegistry
} else { // Add to existing mashlib
  panes = (window as any).panes
  UI = panes.UI
}
*/
const kb = UI.store
const ns = UI.ns

const thisPane: PaneDefinition = { // 'noun_638141.svg' not editing

  global: false,

  icon: UI.icons.iconBase + 'noun_15059.svg', // head.  noun_492246.svg for editing

  name: 'profile',

  label: function (subject) {
    var t = kb.findTypeURIs(subject)
    if (t[ns.vcard('Individual').uri]
       || t[ns.vcard('Organization').uri]
       || t[ns.foaf('Person').uri]
       || t[ns.schema('Person').uri]) return 'Profile'
    return null
  },

  render: function (subject, dom) {
    function paneDiv (dom: HTMLDocument, subject: NamedNode, paneName: string) {
      var p = panes.byName(paneName)
      var d = p.render(subject, dom)
      d.setAttribute('style', 'border: 0.3em solid #444; border-radius: 0.5em')
      return d
    }

    async function doRender(container, subject, dom) {
      const profile = subject.doc()
      let otherProfiles = kb.each(subject, ns.rdfs('seeAlso'), null, profile)
      if (otherProfiles.length > 0) {
        try {
          await kb.fetcher.load(otherProfiles)
        } catch (err) {
          container.appendChild(UI.widgets.errorMessageBlock(err))
        }
      }


      var backgroundColor = kb.anyValue(subject, ns.solid('profileBackgroundColor'))  || '#ffffff'
      // Todo: check format of color matches regexp and not too dark
      container.style.backgroundColor = backgroundColor // @@ Limit to pale?
      var highlightColor = kb.anyValue(subject, ns.solid('profileHighlightColor'))  || '#090' // @@ beware injection attack

      container.setAttribute('style', 'border: 0.3em solid ' + highlightColor + '; border-radius: 0.5em; padding: 0.7em; margin-top:0.7em;')
      var table = container.appendChild(dom.createElement('table'))
      // var top = table.appendChild(dom.createElement('tr'))
      var main = table.appendChild(dom.createElement('tr'))
      var bottom = table.appendChild(dom.createElement('tr'))
      var statusArea = bottom.appendChild(dom.createElement('div'))
      statusArea.setAttribute('style', 'padding: 0.7em;')

      function comment (str: string) {
        var p = main.appendChild(dom.createElement('p'))
        p.setAttribute('style', 'padding: 1em;')
        p.textContent = str
        return p
      }

      function heading (str: string) {
        var h = main.appendChild(dom.createElement('h3'))
        h.setAttribute('style', 'color:' + highlightColor + ';')
        h.textContent = str
        return h
      }

      // Todo: only show this if there is
      heading('Contact')
      main.appendChild(paneDiv(dom, subject, 'contact'))

      if (kb.holds(subject, ns.foaf('knows'))) {
        heading('Solid Friends')
        UI.widgets.attachmentList(dom, subject, container, {
          doc: profile,
          modify: false,
          predicate: ns.foaf('knows'),
          noun: 'friend'
        })
      }
    }
    var  container = dom.createElement('div')
    doRender(container, subject, dom) // async
    return container // initially unpopulated
  } // render()

} //

export default thisPane
// ENDS
