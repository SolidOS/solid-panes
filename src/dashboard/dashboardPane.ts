import { SolidSession } from '../types'
import { authn, icons, store } from 'solid-ui'
import { Fetcher, NamedNode, sym } from 'rdflib'
import { generateHomepage } from './homepage'
import { DataBrowserContext, PaneDefinition } from 'pane-registry'

export const dashboardPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_547570.svg',
  name: 'dashboard',
  label: subject => {
    if (subject.uri === subject.site().uri) {
      return 'Dashboard'
    }
    return null
  },
  render: (subject, context) => {
    const dom = context.dom
    const container = dom.createElement('div')
    authn.solidAuthClient.trackSession(async (session: SolidSession) => {
      container.innerHTML = ''
      buildPage(
        container,
        session ? sym(session.webId) : null,
        context,
        subject
      )
    })

    return container
  }
}

function buildPage (
  container: HTMLElement,
  webId: NamedNode | null,
  context: DataBrowserContext,
  subject: NamedNode
) {
  if (webId && webId.site().uri === subject.site().uri) {
    return buildDashboard(container, context)
  }
  return buildHomePage(container, subject)
}

function buildDashboard (container: HTMLElement, context: DataBrowserContext) {
  // @@ TODO get a proper type
  const outliner: any = context.getOutliner(context.dom)
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
  generateHomepage(subject, store, store.fetcher as Fetcher).then(homepage =>
    shadow.appendChild(homepage)
  )
}

export default dashboardPane
