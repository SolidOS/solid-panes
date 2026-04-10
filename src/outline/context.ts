import { DataBrowserContext, PaneRegistry, RenderEnvironment } from 'pane-registry'
import { getOutliner } from '../index'
import { SolidLogic } from 'solid-logic'
import { LiveStore } from 'rdflib'

export function createContext (
  dom: HTMLDocument,
  paneRegistry: PaneRegistry,
  store: LiveStore,
  logic: SolidLogic,
  environment?: RenderEnvironment
): DataBrowserContext {
  return {
    dom,
    getOutliner,
    session: {
      paneRegistry,
      // @ts-ignore
      store,
      // @ts-ignore
      logic
    },
    environment
  }
}
