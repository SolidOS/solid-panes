import { icons } from 'solid-ui'
import { authn, authSession, store } from 'solid-logic'
import { Fetcher, NamedNode } from 'rdflib'
import { generateHomepage } from './homepage'
import { DataBrowserContext, PaneDefinition } from 'pane-registry'

export const dashboardPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_547570.svg',
  name: 'dashboard',
  label: subject => {
    console.log()
    if (subject.uri === subject.site().uri) {
      return 'Dashboard'
    }
    return null
  },
  render: (subject, context) => {
    console.log('Dashboard Pane Render')
    const dom = context.dom
    const container = dom.createElement('div')
    const runBuildPage = () => {
      container.innerHTML = ''
      buildPage(
        container,
        authn.currentUser() || null,
        context,
        subject
      )
    }

    authSession.events.on("login", () => {
      // console.log('On Login')
      runBuildPage()
    })
    authSession.events.on("sessionRestore", () => {
      // console.log('On Session Restore')
      runBuildPage()
    })
    // console.log('Initial Load')
    runBuildPage()

    return container
  }
}

function buildPage (
  container: HTMLElement,
  webId: NamedNode | null,
  context: DataBrowserContext,
  subject: NamedNode
) {
  // if uri then SolidOS is a browse.html web app
  const uri = (new URL(window.location.href)).searchParams.get('uri')
  if (webId && (uri || webId.site().uri === subject.site().uri)) {
    return buildDashboard(container, context)
  }
  return buildHomePage(container, subject)
}

function buildDashboard (container: HTMLElement, context: DataBrowserContext) {
  // console.log('build dashboard')
  // @@ TODO get a proper type
  const outliner: any = context.getOutliner(context.dom)
  outliner
    .getDashboard()
    .then((dashboard: HTMLElement) => container.appendChild(dashboard))
}

function buildHomePage (container: HTMLElement, subject: NamedNode) {
  // console.log('build home page')
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
