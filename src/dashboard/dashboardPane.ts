import { icons } from 'solid-ui'
import { authn, authSession, store } from 'solid-logic'
import { Fetcher, NamedNode } from 'rdflib'
import { generateHomepage } from './homepage'
import { DataBrowserContext, PaneDefinition } from 'pane-registry'

export const dashboardPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_547570.svg',
  name: 'dashboard',
  label: subject => {
    if (subject.termType === 'NamedNode' && subject.uri === subject.site().uri) {
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

    authSession.events.on('login', () => {
      // console.log('On Login')
      runBuildPage()
    })
    authSession.events.on('sessionRestore', () => {
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
  subject: NamedNode | null
) {
  const uri = (new URL(window.location.href)).searchParams.get('uri')

  if (uri && webId) {
    return buildDashboard(container, context)
  }

  if (!uri && subject) {
    return buildHomePage(container, subject)
  }

  if (!uri && !subject && webId) {
    return buildDashboard(container, context)
  }

  const fallbackSubject = subject || webId || store.sym(window.location.href)
  return buildHomePage(container, fallbackSubject)
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
