import { PaneDefinition, SolidSession } from "../types"
import solidUi, { SolidUi } from "solid-ui"
import paneRegistry from "pane-registry"
import { NamedNode, sym } from "rdflib"
import { generateHomepage } from "./homepage"

let panes: any
let UI: SolidUi

const nodeMode = (typeof module !== "undefined")

if (nodeMode) {
  UI = solidUi
  panes = paneRegistry
} else { // Add to existing mashlib
  panes = (window as any).panes
  UI = panes.UI
}

export const dashboardPane: PaneDefinition = {
  icon: UI.icons.iconBase + "noun_547570.svg",
  name: "dashboard",
  label: (subject) => {
    if (subject.uri === `${location.origin}/`) {
      return "Dashboard"
    }
    return null
  },
  render: (subject, dom) => {
    const container = dom.createElement("div")
    const webId = UI.authn.currentUser()
    buildPage(container, webId, dom)
    UI.authn.solidAuthClient.trackSession(async (session: SolidSession) => {
      container.innerHTML = ""
      buildPage(container, session ? sym(session.webId) : null, dom)
    })

    return container
  }
}

function buildPage (container: HTMLElement, webId: NamedNode | null, dom: HTMLDocument) {
  if (!webId) {
    return buildHomePage(container)
  }
  const webIdDefaultPod = new URL(webId.uri).origin
  if (webIdDefaultPod === location.origin) {
    return buildDashboard(container, dom)
  }
  return buildHomePage(container)
}

function buildDashboard (container: HTMLElement, dom: HTMLDocument) {
  const outliner = panes.getOutliner(dom)
  outliner.showDashboard(container)
}

function buildHomePage (container: HTMLElement) {
  const wrapper = document.createElement('div')
  container.appendChild(wrapper)
  const shadow = wrapper.attachShadow({ mode: 'open' })
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/common/css/bootstrap.min.css'
  shadow.appendChild(link)
  generateHomepage(UI.store, UI.store.fetcher).then(homepage => shadow.appendChild(homepage))
}


export default dashboardPane
