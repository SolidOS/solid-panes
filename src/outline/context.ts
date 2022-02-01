import { DataBrowserContext, PaneRegistry } from 'pane-registry'
import { getOutliner } from '../index'
import { SolidLogic } from 'solid-logic'
import { LiveStore } from 'rdflib'

export function createContext (
  dom: HTMLDocument,
  paneRegistry: PaneRegistry,
  store: LiveStore,
  logic: SolidLogic
): DataBrowserContext {
  return {
    dom,
    getOutliner,
    session: {
      paneRegistry,
      store,
      logic
    }
  }
}
