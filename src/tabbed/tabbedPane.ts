/*   Tabbed view of anything
 **
 ** data-driven
 **
 */
import { DataBrowserContext, PaneDefinition } from 'pane-registry'
import { NamedNode } from 'rdflib'
import { icons, ns, tabs, widgets } from 'solid-ui'

const TabbedPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_688606.svg',

  name: 'tabbed',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve this pane?
  label: (subject, context) => {
    const kb = context.session.store
    const typeURIs = kb.findTypeURIs(subject)
    if (ns.meeting('Cluster').uri in typeURIs) {
      return 'Tabbed'
    }
    return null
  },

  render: (subject, context) => {
    const dom = context.dom
    const store = context.session.store
    const div = dom.createElement('div')

    ;(async () => {
      // @@ TODO Remove castings...
      await ((store as any).fetcher.load as any)(subject)

      div.appendChild(tabs.tabWidget({
        dom,
        subject,
        predicate: store.any(subject, ns.meeting('predicate')) || ns.meeting('toolList'),
        ordered: true,
        orientation: store.anyValue(subject, ns.meeting('orientation')) || 0,
        renderMain: prepareRenderMainFn(context),
        renderTab: prepareRenderTabFn(subject, context),
        backgroundColor: store.anyValue(subject, ns.ui('backgroundColor')) || '#ddddcc'
      }))
    })()
    return div
  }
}

function prepareRenderTabFn (subject: NamedNode, context: DataBrowserContext): (div, item) => void {
  const predicate = context.session.store.the(subject, ns.meeting('predicate'))
  return (div, item) => {
    div.appendChild(widgets.personTR(context.dom, predicate, item, {}))
  }
}

function prepareRenderMainFn (context: DataBrowserContext): (containerDiv, item) => void {
  return (containerDiv, item) => {
    containerDiv.innerHTML = ''
    const table = containerDiv.appendChild(context.dom.createElement('table'))
    ;(context.getOutliner(context.dom) as any).GotoSubject(item, true, null, false, undefined, table)
  }
}

export default TabbedPane
