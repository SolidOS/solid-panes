import { PaneDefinition, SolidSession } from '../types'
import { authn, icons, store } from 'solid-ui'
import panes from 'pane-registry'
import { NamedNode, sym } from 'rdflib'
import { generateHomepage } from './homepage'

export const dashboardPaneSource: PaneDefinition = {
  icon: icons.iconBase + 'noun_547570.svg',
  name: 'dashboard',
  label: subject => {
    if (subject.uri === subject.site().uri) {
      return 'Dashboard'
    }
    return null
  },
  render: (subject, dom) => {
    const container = dom.createElement('div')
    authn.solidAuthClient.trackSession(async (session: SolidSession) => {
      container.innerHTML = ''
      buildPage(container, session ? sym(session.webId) : null, dom, subject)
    })

    return container
  }
}

function buildPage (
  container: HTMLElement,
  webId: NamedNode | null,
  dom: HTMLDocument,
  subject: NamedNode
) {
  if (webId && webId.site().uri === subject.site().uri) {
    return buildDashboard(container, dom)
  }
  return buildHomePage(container, subject)
}

function buildDashboard (container: HTMLElement, dom: HTMLDocument) {
  const outliner = panes.getOutliner(dom)
  outliner
    .getDashboard()
    .then((dashboard: HTMLElement) => container.appendChild(dashboard))
}

function buildHomePage (container: HTMLElement, subject: NamedNode) {
  const wrapper = document.createElement('div')
  container.appendChild(wrapper)
  const shadow = wrapper.attachShadow({ mode: 'open' })
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/common/css/bootstrap.min.css'
  shadow.appendChild(link)
  generateHomepage(subject, store, store.fetcher).then(homepage =>
    shadow.appendChild(homepage)
  )
}

export default dashboardPaneSource
