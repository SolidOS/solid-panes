import { DataBrowserContext, PaneRegistry } from 'pane-registry'
import { getOutliner } from '../index'
import { IndexedFormula } from 'rdflib'

export function createContext (
  dom: HTMLDocument,
  paneRegistry: PaneRegistry,
  store: IndexedFormula
): DataBrowserContext {
  return {
    dom,
    getOutliner,
    session: {
      paneRegistry,
      store
    }
  }
}
