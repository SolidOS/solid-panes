import { PaneDefinition } from "../types"
import * as panes from "pane-registry"
import { namedNode, NamedNode } from "rdflib"
import * as UI from "solid-ui"
import { loadExtension } from "./extension.service"

class SolidElement extends HTMLElement {
  private getSubject (): NamedNode {
    if (this.hasAttribute("subject")) {
      return namedNode(this.getAttribute("subject")!)
    }
    return namedNode(location.href)
  }

  private async getView () {
    const origin = this.getAttribute("origin")!
    if (this.hasAttribute("origin")) {
      try {
        return await loadExtension(UI.store, UI.store.fetcher, origin, document.body)
      } catch (e) {
        return panes.byName(origin)
      }
    }
    return null
  }

  async connectedCallback () {
    const subject = this.getSubject()
    const view = await this.getView()

    if (view) {
      this.innerHTML = ""
      return this.appendChild(view.render(subject, document))
    }
    console.warn(`Unable to load application from ${this.getAttribute('origin')}`)
  }
}

if ("customElements" in window) {
  customElements.define("solid-element", SolidElement)
}
