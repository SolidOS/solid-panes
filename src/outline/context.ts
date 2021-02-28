import { DataBrowserContext, LiveStore, PaneRegistry } from 'pane-registry'
import { getOutliner } from '../index'
import { solidLogicSingleton } from 'solid-ui'
import { SolidLogic } from 'solid-logic'

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
