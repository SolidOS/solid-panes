import { DataBrowserContext, LiveStore, PaneRegistry } from 'pane-registry'
import { getOutliner } from '../index'

export function createContext (
  dom: HTMLDocument,
  paneRegistry: PaneRegistry,
  store: LiveStore
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
