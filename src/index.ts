/*                            SOLID PANES
 **
 **     Panes are regions of the outline view in which a particular subject is
 ** displayed in a particular way.
 ** Different panes about the same subject are typically stacked vertically.
 ** Panes may be used naked or with a pane selection header.
 **
 ** The label() method has two functions: it determines whether the pane is
 ** relevant to a given subject, returning null if not.
 ** If it is relevant, then it returns a suitable tooltip for a control which selects the pane
 */

import versionInfo from './versionInfo'
import * as UI from 'solid-ui'
import { LiveStore } from 'rdflib'
import { solidLogicSingleton, store } from 'solid-logic'
import OutlineManager from './outline/manager.js'
import { registerPanes } from './registerPanes.js'
import {
  list,
  paneForIcon,
  paneForPredicate,
  register,
  byName,
  RenderEnvironment
} from 'pane-registry'
import { createContext } from './outline/context'
import { initMainPage, refreshUI } from './mainPage'

function getOutliner (dom, environment?: RenderEnvironment): OutlineManager {
  if (!dom.outlineManager) {
    const context = createContext(
      dom,
      { list, paneForIcon, paneForPredicate, register, byName },
      store as LiveStore,
      solidLogicSingleton,
      environment
    )
    dom.outlineManager = new OutlineManager(context)
  } else if (environment) {
    dom.outlineManager.context = dom.outlineManager.context || {}
    dom.outlineManager.context.environment = environment
  }
  return dom.outlineManager
}

function updateEnvironment (outliner: OutlineManager, environment: RenderEnvironment) {
  if (!outliner) return
  outliner.context = outliner.context || {}
  outliner.context.environment = environment
}

if (typeof window !== 'undefined') {
  getOutliner(window.document)
}

registerPanes((cjsOrEsModule: any) => register(cjsOrEsModule.default || cjsOrEsModule))

// This has common outline mode functionality for the default and other other panes
// A separate outline manager is required per DOM in cases like a browser extension
// where there are many occurrences of window and of window.document
// But each DOM should have just one outline manager.

export {
  OutlineManager,
  getOutliner,
  updateEnvironment,
  UI,
  versionInfo,
  initMainPage,
  refreshUI,
  list, // from paneRegistry
  paneForIcon, // from paneRegistry
  paneForPredicate, // from paneRegistry
  register, // from paneRegistry
  byName // from paneRegistry
}

// export for simpler access by non-node scripts
if (typeof window !== 'undefined') {
  ;(<any>window).panes = {
    getOutliner
  }
}
