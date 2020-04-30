/**
 * Display A Public Profile Pane
 *
 * This is the subject's primary representation in the world.
 * When anyone scans the QR code of their WebID on their card, it takes them
 * to here and here alone.  This had better be good.  This had better be
 * worth the subject joining solid for
 * - informative
 *
 * Usage: paneRegistry.register('profile/profilePane')
 * or standalone script adding onto existing mashlib.
 */

import { icons, ns, widgets } from 'solid-ui'
import { NamedNode } from 'rdflib'
import { paneDiv } from './profile.dom'
import { PaneDefinition } from 'pane-registry'

const thisPane: PaneDefinition = {
  global: false,

  icon: icons.iconBase + 'noun_15059.svg',

  name: 'profile',

  label: function (subject, context) {
    const t = context.session.store.findTypeURIs(subject)
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
      const otherProfiles = store.each(subject, ns.rdfs('seeAlso'), null, profile) as Array<NamedNode>
      if (otherProfiles.length > 0) {
        try {
          await store.fetcher.load(otherProfiles)
        } catch (err) {
          container.appendChild(widgets.errorMessageBlock(err))
        }
      }

      const backgroundColor = store.anyValue(subject, ns.solid('profileBackgroundColor'), null, subject.doc()) || '#ffffff'
      // Todo: check format of color matches regexp and not too dark
      container.style.backgroundColor = backgroundColor // @@ Limit to pale?
      const highlightColor = store.anyValue(subject, ns.solid('profileHighlightColor', null, subject.doc())) || '#090' // @@ beware injection attack
      container.style.border = `0.3em solid ${highlightColor}`
      container.style.borderRadius = '0.5em'
      container.style.padding = '0.7em'
      container.style.marginTop = '0.7em'
      const table = container.appendChild(dom.createElement('table'))
      // const top = table.appendChild(dom.createElement('tr'))
      const main = table.appendChild(dom.createElement('tr'))
      const bottom = table.appendChild(dom.createElement('tr'))
      const statusArea = bottom.appendChild(dom.createElement('div'))
      statusArea.setAttribute('style', 'padding: 0.7em;')

      function heading (str: string) {
        const h = main.appendChild(dom.createElement('h3'))
        h.setAttribute('style', `font-size: 120%; color:${highlightColor};`)
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
    const container = dom.createElement('div')
    doRender(container, subject, dom) // async
    return container // initially unpopulated
  } // render()
} //

export default thisPane
// ENDS
