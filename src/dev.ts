import { initMainPage } from './mainPage'
import type { NamedNode } from 'rdflib'
import type { DataBrowserContext, PaneDefinition } from 'pane-registry'

export default {
  icon: '🔍',
  name: 'solid-panes',
  label: () => 'Solid Panes',
  render (subject: NamedNode, context: DataBrowserContext) {
    const container = document.createElement('div')
    const main = document.createElement('div')

    main.id = 'MainContent'

    container.appendChild(main)

    setTimeout(() => initMainPage(context.session.store, subject), 100)

    return container
  }
} satisfies PaneDefinition
