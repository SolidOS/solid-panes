/*   Tabbed view of anything
 **
 ** data-driven
 **
 */
import { Store } from 'rdflib'
import { PaneDefinition } from 'pane-registry'
import { icons, ns, tabs, widgets } from 'solid-ui'

const TabbedPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_688606.svg',

  name: 'tabbed',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve this pane?
  label: (subject, context) => {
    const kb = context.session.store as Store
    const typeURIs = kb.findTypeURIs(subject)
    if (ns.meeting('Cluster').uri in typeURIs) {
      return 'Tabbed'
    }
    return null
  },

  render: (subject, context) => {
    const dom = context.dom
    const store = context.session.store as Store
    const div = dom.createElement('div')

    ;(async () => {
      if (!store.fetcher) {
        throw new Error('Store has no fetcher')
      }
      await store.fetcher.load(subject)

      div.appendChild(tabs.tabWidget({
        dom,
        subject,
        predicate: store.any(subject, ns.meeting('predicate')) || ns.meeting('toolList'),
        ordered: true,
        orientation: ((store as Store).anyValue(subject, ns.meeting('orientation')) || '0') as ('0' | '1' | '2' | '3'),
        renderMain: (containerDiv, item) => {
          containerDiv.innerHTML = ''
          const table = containerDiv.appendChild(context.dom.createElement('table'))
          ;(context.getOutliner(context.dom) as any).GotoSubject(item, true, null, false, undefined, table)
        },
        renderTab: (containerDiv, item) => {
          const predicate = store.the(subject, ns.meeting('predicate'))
          containerDiv.appendChild(widgets.personTR(context.dom, predicate, item, {}))
        },
        backgroundColor: store.anyValue(subject, ns.ui('backgroundColor')) || '#ddddcc'
      }))
    })()
    return div
  }
}

export default TabbedPane
