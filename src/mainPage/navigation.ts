import type { LiveStore } from 'rdflib'
import * as paneRegistry from 'pane-registry'
import type { OutlineManager } from '../outline/manager'
import { createNavigationController, type NavigationController } from '../navigation/controller'
import { selectNavbarPane } from './navbar'
import { refreshProfileHeading } from './profileHeading'

const controllers = new WeakMap<OutlineManager, NavigationController>()

/** The page's navigation controller for an outliner, created on first use. */
export function navigationFor (outliner: OutlineManager, store: LiveStore): NavigationController {
  let controller = controllers.get(outliner)
  if (!controller) {
    controller = createNavigationController({
      store,
      outliner,
      byName: paneRegistry.byName,
      effects: { selectNavbarPane, refreshHeading: refreshProfileHeading }
    })
    controllers.set(outliner, controller)
  }
  return controller
}
